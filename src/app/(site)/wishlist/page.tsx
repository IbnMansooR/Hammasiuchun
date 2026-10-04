"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import FontCard from "@/components/FontCard";
import { cardsFaceCSS, type CardFont } from "@/lib/cards";
import { IconArrow, IconHeart } from "@/components/Icons";

/** Saved families as real specimen cards. The list lives in this browser
 * (localStorage); card data is fetched for the saved slugs. */
export default function WishlistPage() {
  const { wish, ready } = useStore();
  const [cards, setCards] = useState<CardFont[] | null>(null);
  const key = wish.map((w) => w.slug).join(",");

  useEffect(() => {
    if (!ready) return;
    if (!key) { setCards([]); return; }
    const ctl = new AbortController();
    fetch(`/api/search?slugs=${encodeURIComponent(key)}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d: { items: CardFont[] }) => setCards(d.items ?? []))
      .catch(() => { /* aborted / offline — keep the previous list */ });
    return () => ctl.abort();
  }, [key, ready]);

  // Keep removed cards out instantly, without waiting for a refetch.
  const shown = (cards ?? []).filter((c) => wish.some((w) => w.slug === c.slug));
  const loading = !ready || cards === null;

  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Sevimlilar</div>
        <h1>Saqlangan shriftlar</h1>
        <p className="lead">
          {loading ? "Yuklanmoqda…" : wish.length ? `${wish.length} ta oila. Roʻyxat shu brauzerda saqlanadi.` : "Yoqqan shriftni ♡ bilan belgilang — u shu yerda turadi."}
        </p>
      </header>

      {!loading && wish.length === 0 ? (
        <div className="empty" style={{ paddingTop: 24 }}>
          <div className="display" style={{ display: "grid", placeItems: "center" }}><IconHeart style={{ width: 56, height: 56, color: "var(--line-2)" }} /></div>
          <p>Hali hech narsa saqlanmagan. Katalogni koʻrib chiqing va yoqqanlarini belgilang.</p>
          <Link href="/fonts" className="btn btn-primary">Shriftlarni koʻrish <IconArrow className="ico" /></Link>
        </div>
      ) : (
        <>
          <style dangerouslySetInnerHTML={{ __html: cardsFaceCSS(shown) }} />
          <div className="fgrid" aria-busy={loading}>
            {shown.map((f) => <FontCard key={f.slug} f={f} headingLevel={2} />)}
          </div>
        </>
      )}
    </div>
  );
}
