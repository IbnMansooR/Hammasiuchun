"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { trackEvent } from "@/lib/trackClient";
import { offerSave } from "@/lib/savePrompt";

export type StoreItem = { slug: string; name: string };

type Ctx = {
  wish: StoreItem[];
  ready: boolean;
  /** Signed in: the list is kept on the account as well as in this browser. */
  signedIn: boolean;
  toggleWish: (i: StoreItem) => void;
  removeWish: (slug: string) => void;
  inWish: (slug: string) => boolean;
};

const StoreCtx = createContext<Ctx | null>(null);

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

/** Parse storage defensively: must be an array of well-formed items. Older
 * entries also carried price/tier fields — only slug + name are kept. */
function load(key: string): StoreItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is StoreItem => !!x && typeof x.slug === "string" && typeof x.name === "string")
      .map((x) => ({ slug: x.slug, name: x.name }));
  } catch {
    return [];
  }
}

function save(key: string, val: StoreItem[]) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ }
}

const WISH = "feekr_wish";
// Set once this browser's list has been tied to an account. If the visitor is later
// signed out, the list is dropped so the next person on a shared computer starts clean.
const OWNED = "feekr_wish_owned";
// Set while this browser has a change the account has not received yet (offline, or the
// 600 ms debounce). Only then is the browser's list merged into the account's; otherwise the
// account is the truth, so something removed on another device stays removed here.
const DIRTY = "feekr_wish_dirty";
const MAX_WISH = 500;
const flag = (k: string, on: boolean) => { try { if (on) localStorage.setItem(k, "1"); else localStorage.removeItem(k); } catch { /* storage blocked */ } };
const flagged = (k: string) => { try { return localStorage.getItem(k) === "1"; } catch { return false; } };

const JSON_HEADERS = { "content-type": "application/json" };

export default function StoreProvider({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  const [wish, setWish] = useState<StoreItem[]>([]);
  const [ready, setReady] = useState(false);
  const wishRef = useRef<StoreItem[]>([]);
  wishRef.current = wish;
  const syncedKey = useRef<string | null>(null); // the list the server is known to hold; null until the first sync
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;

  useEffect(() => {
    setWish(load(WISH));
    try { localStorage.removeItem("feekr_cart"); } catch { /* the cart is gone — drop leftovers */ }
    setReady(true);
    // Keep tabs in sync: adopt changes written by another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === WISH) setWish(load(WISH));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (ready) save(WISH, wish); }, [wish, ready]);

  // Account sync: on sign-in, merge the browser's list with the account's and keep both equal.
  useEffect(() => {
    if (!ready) return;
    if (!signedIn) {
      syncedKey.current = null;
      try {
        if (localStorage.getItem(OWNED)) {
          localStorage.removeItem(OWNED);
          localStorage.removeItem(DIRTY);
          localStorage.removeItem(WISH);
          setWish([]);
        }
      } catch { /* storage blocked */ }
      return;
    }
    const ctl = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/me/wish", { cache: "no-store", signal: ctl.signal });
        if (!r.ok) return;
        const server: StoreItem[] = (await r.json()).items ?? [];
        // First time on this account → merge what was saved while signed out. Afterwards the account wins,
        // except for changes it has not received yet.
        const adopt = flagged(OWNED) && !flagged(DIRTY);
        const merged = [...server];
        if (!adopt) for (const l of wishRef.current) if (!merged.some((m) => m.slug === l.slug)) merged.push(l);
        const capped = merged.slice(0, MAX_WISH);
        let result = server;
        if (capped.length !== server.length) {
          const p = await fetch("/api/me/wish", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ items: capped.map((m) => m.slug) }), signal: ctl.signal });
          if (!p.ok) return; // keep the local list; the next change retries
          result = (await p.json()).items ?? capped;
        }
        syncedKey.current = result.map((x) => x.slug).join(",");
        setWish(result);
        flag(OWNED, true);
        flag(DIRTY, false);
      } catch { /* aborted / offline */ }
    })();
    return () => ctl.abort();
  }, [ready, signedIn]);

  // After the first sync, push every change (debounced) so other devices see it.
  useEffect(() => {
    if (!ready || !signedIn || syncedKey.current === null) return;
    const key = wish.map((x) => x.slug).join(",");
    if (key === syncedKey.current) return;
    const t = window.setTimeout(() => {
      fetch("/api/me/wish", { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ items: wish.slice(0, MAX_WISH).map((x) => x.slug) }) })
        .then((r) => { if (r.ok) { syncedKey.current = key; flag(DIRTY, false); } })
        .catch(() => { /* offline: retried on the next change */ });
    }, 600);
    return () => window.clearTimeout(t);
  }, [wish, ready, signedIn]);

  const toggleWish = useCallback(
    (i: StoreItem) => {
      const had = wishRef.current.some((x) => x.slug === i.slug);
      if (!had) {
        // Count only additions (a removal is not interest).
        trackEvent("wish", i.slug);
        // A second saved font is the moment saving it to an account is worth offering.
        if (wishRef.current.length + 1 >= 2) offerSave("wish", { n: wishRef.current.length + 1 });
      }
      if (signedInRef.current) flag(DIRTY, true);
      setWish((w) => (w.some((x) => x.slug === i.slug) ? w.filter((x) => x.slug !== i.slug) : w.length >= MAX_WISH ? w : [...w, { slug: i.slug, name: i.name }]));
    },
    [],
  );
  const removeWish = useCallback((slug: string) => {
    if (signedInRef.current) flag(DIRTY, true);
    setWish((w) => w.filter((x) => x.slug !== slug));
  }, []);
  const inWish = useCallback((slug: string) => wish.some((x) => x.slug === slug), [wish]);

  return (
    <StoreCtx.Provider value={{ wish, ready, signedIn, toggleWish, removeWish, inWish }}>
      {children}
    </StoreCtx.Provider>
  );
}
