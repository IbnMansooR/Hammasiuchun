"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { trackEvent } from "@/lib/trackClient";

export type StoreItem = { slug: string; name: string };

type Ctx = {
  wish: StoreItem[];
  ready: boolean;
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

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [wish, setWish] = useState<StoreItem[]>([]);
  const [ready, setReady] = useState(false);
  const wishRef = useRef<StoreItem[]>([]);
  wishRef.current = wish;

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

  const toggleWish = useCallback(
    (i: StoreItem) => {
      // Count only additions (a removal is not interest).
      if (!wishRef.current.some((x) => x.slug === i.slug)) trackEvent("wish", i.slug);
      setWish((w) => (w.some((x) => x.slug === i.slug) ? w.filter((x) => x.slug !== i.slug) : [...w, { slug: i.slug, name: i.name }]));
    },
    [],
  );
  const removeWish = useCallback((slug: string) => setWish((w) => w.filter((x) => x.slug !== slug)), []);
  const inWish = useCallback((slug: string) => wish.some((x) => x.slug === slug), [wish]);

  return (
    <StoreCtx.Provider value={{ wish, ready, toggleWish, removeWish, inWish }}>
      {children}
    </StoreCtx.Provider>
  );
}
