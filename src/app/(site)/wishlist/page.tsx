"use client";
import Link from "@/components/LLink";
import { useEffect, useState } from "react";
import { useStore } from "@/components/StoreProvider";
import FontCard from "@/components/FontCard";
import { cardsFaceCSS, type CardFont } from "@/lib/cards";
import { IconArrow, IconHeart } from "@/components/Icons";
import { trackEvent } from "@/lib/trackClient";
import { useT } from "@/i18n/client";

/** Saved families as real specimen cards. The list lives in this browser
 * (localStorage); card data is fetched for the saved slugs. */
export default function WishlistPage() {
  const { wish, ready, signedIn } = useStore();
  const t = useT().wishlist;
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
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">
          {loading ? t.loading : wish.length ? `${t.count(wish.length)} ${signedIn ? t.synced : t.local}` : t.emptyLead}
        </p>
      </header>

      {!loading && !signedIn && wish.length > 0 && (
        <aside className="wish-note">
          <p><b>{t.noteB}</b>{t.note}</p>
          <Link href="/register" className="btn btn-primary btn-sm" onClick={() => trackEvent("prompt_click", "wishlist")}>{t.save}</Link>
        </aside>
      )}

      {!loading && wish.length === 0 ? (
        <div className="empty" style={{ paddingTop: 24 }}>
          <div className="display" style={{ display: "grid", placeItems: "center" }}><IconHeart style={{ width: 56, height: 56, color: "var(--line-2)" }} /></div>
          <p>{t.empty}</p>
          <Link href="/fonts" className="btn btn-primary">{t.seeFonts} <IconArrow className="ico" /></Link>
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
