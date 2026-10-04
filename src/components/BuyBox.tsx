"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { useStore } from "./StoreProvider";

export default function BuyBox({
  slug, name, priceCents, isFree, tier, styleCount, demoStyle,
}: {
  slug: string; name: string; priceCents: number; isFree: boolean; tier: string; styleCount: number;
  demoStyle: string | null;
}) {
  const { addToCart, inCart, toggleWish, inWish, ready } = useStore();
  const [soon, setSoon] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = { slug, name, priceCents, isFree, tier };

  // Dialog basics: focus moves into it, Esc closes, focus returns to the opener.
  useEffect(() => {
    if (!soon) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSoon(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [soon]);
  const added = ready && inCart(slug);
  const wished = ready && inWish(slug);

  const sub =
    tier === "free" ? `To'liq oila — ${styleCount} uslub, bepul. Barchasi bitta ZIP faylda.`
    : tier === "demo" ? `To'liq oila — ${styleCount} uslub. Demo bepul.`
    : `To'liq oila — ${styleCount} uslub. To'liq pullik.`;

  return (
    <div className="buybox">
      <div className="price">{formatPrice(priceCents, isFree)}</div>
      <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px" }}>{sub}</p>

      {tier === "free" ? (
        <a className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} href={`/api/download-family/${slug}`}>
          Butun oilani yuklab olish ({styleCount})
        </a>
      ) : tier === "paid" ? (
        <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={() => setSoon(true)}>
          Sotib olish — {formatPrice(priceCents, isFree)}
        </button>
      ) : added ? (
        <Link className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} href="/cart">
          ✓ Savatda — Savatchaga o&apos;tish
        </Link>
      ) : (
        <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={() => addToCart(item)}>
          Savatga qo&apos;shish — {formatPrice(priceCents, isFree)}
        </button>
      )}

      <button
        className="btn"
        style={{ width: "100%", justifyContent: "center", marginTop: 10, borderColor: wished ? "var(--accent)" : undefined, color: wished ? "var(--accent)" : undefined }}
        onClick={() => toggleWish(item)}
      >
        {wished ? "♥ Sevimlilarda" : "♡ Sevimlilarga qo'shish"}
      </button>

      {tier === "demo" && demoStyle && (
        <a className="btn" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} href={`/api/download/${slug}/${demoStyle}`}>
          Demo yuklab olish ({demoStyle})
        </a>
      )}
      {tier === "paid" && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12, textAlign: "center" }}>
          Bu shrift uchun bepul demo mavjud emas.
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
        <li style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>✓ Desktop litsenziya</li>
        <li style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>✓ Web (WOFF2) litsenziya</li>
        <li style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>✓ Umrbod foydalanish</li>
      </ul>

      {soon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="soon-title"
          onClick={() => setSoon(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.5)",
            display: "grid", placeItems: "center", padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 18, padding: "32px 28px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 30px 80px -20px rgba(0,0,0,.4)" }}
          >
            <div style={{ fontSize: 44, marginBottom: 6 }}>🚀</div>
            <h2 id="soon-title" style={{ fontSize: 24, marginBottom: 10 }}>Tez kunda!</h2>
            <p className="muted" style={{ fontSize: 15, marginBottom: 22 }}>
              Pullik shriftlarni sotib olish imkoniyati tez kunda ishga tushadi. Hozircha{" "}
              <strong>{name}</strong> shriftini sevimlilarga qoʻshib qoʻying yoki biz bilan bogʻlaning.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/support" className="btn btn-accent">Bogʻlanish</Link>
              <button ref={closeRef} className="btn" onClick={() => setSoon(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
