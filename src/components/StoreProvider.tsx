"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type StoreItem = { slug: string; name: string; priceCents: number; isFree: boolean; tier: string };

type Ctx = {
  cart: StoreItem[];
  wish: StoreItem[];
  ready: boolean;
  addToCart: (i: StoreItem) => void;
  removeFromCart: (slug: string) => void;
  inCart: (slug: string) => boolean;
  clearCart: () => void;
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

/** Parse storage defensively: must be an array of well-formed items. */
function load(key: string): StoreItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x): x is StoreItem =>
          !!x && typeof x.slug === "string" && typeof x.name === "string" &&
          typeof x.priceCents === "number" && Number.isFinite(x.priceCents),
      )
      .map((x) => ({ ...x, tier: typeof x.tier === "string" ? x.tier : "demo" }));
  } catch {
    return [];
  }
}

function save(key: string, val: StoreItem[]) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ }
}

const CART = "feekr_cart";
const WISH = "feekr_wish";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<StoreItem[]>([]);
  const [wish, setWish] = useState<StoreItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(load(CART));
    setWish(load(WISH));
    setReady(true);
    // Keep tabs in sync: adopt changes written by another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART) setCart(load(CART));
      if (e.key === WISH) setWish(load(WISH));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  useEffect(() => { if (ready) save(CART, cart); }, [cart, ready]);
  useEffect(() => { if (ready) save(WISH, wish); }, [wish, ready]);

  // "paid" tier has no purchase flow yet (BuyBox shows a "coming soon" modal
  // instead of an add-to-cart button) — refuse it here too so it can never
  // reach checkout via another path (e.g. the wishlist's own "add to cart").
  const addToCart = useCallback(
    (i: StoreItem) => { if (i.tier !== "paid") setCart((c) => (c.some((x) => x.slug === i.slug) ? c : [...c, i])); },
    [],
  );
  const removeFromCart = useCallback((slug: string) => setCart((c) => c.filter((x) => x.slug !== slug)), []);
  const inCart = useCallback((slug: string) => cart.some((x) => x.slug === slug), [cart]);
  const clearCart = useCallback(() => setCart([]), []);
  const toggleWish = useCallback(
    (i: StoreItem) => setWish((w) => (w.some((x) => x.slug === i.slug) ? w.filter((x) => x.slug !== i.slug) : [...w, i])),
    [],
  );
  const removeWish = useCallback((slug: string) => setWish((w) => w.filter((x) => x.slug !== slug)), []);
  const inWish = useCallback((slug: string) => wish.some((x) => x.slug === slug), [wish]);

  return (
    <StoreCtx.Provider value={{ cart, wish, ready, addToCart, removeFromCart, inCart, clearCart, toggleWish, removeWish, inWish }}>
      {children}
    </StoreCtx.Provider>
  );
}
