"use client";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";
import { formatPrice } from "@/lib/format";

export default function WishlistPage() {
  const { wish, removeWish, addToCart, inCart, ready } = useStore();
  if (!ready) return <div className="container section" style={{ paddingTop: 40 }} />;

  return (
    <div className="container section" style={{ paddingTop: 34 }}>
      <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", marginBottom: 24 }}>Sevimlilar</h1>

      {wish.length === 0 ? (
        <div>
          <p className="muted" style={{ fontSize: 17 }}>Sevimlilar ro&apos;yxati bo&apos;sh. Shrift sahifasida ♡ tugmasini bosing.</p>
          <Link href="/fonts" className="btn btn-accent" style={{ marginTop: 16 }}>Shriftlarni ko&apos;rish</Link>
        </div>
      ) : (
        <div>
          {wish.map((i) => (
            <div key={i.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <Link href={`/fonts/${i.slug}`} style={{ fontSize: 19, fontWeight: 700 }}>{i.name}</Link>
                <div className="muted" style={{ fontSize: 13 }}>{formatPrice(i.priceCents, i.isFree)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {i.isFree ? (
                  <a className="btn btn-sm btn-accent" href={`/api/download-family/${i.slug}`}>Yuklab olish</a>
                ) : i.tier === "paid" ? (
                  <Link className="btn btn-sm" href={`/fonts/${i.slug}`}>Tez kunda</Link>
                ) : inCart(i.slug) ? (
                  <Link className="btn btn-sm" href="/cart">Savatda ✓</Link>
                ) : (
                  <button className="btn btn-sm btn-accent" onClick={() => addToCart(i)}>Savatga</button>
                )}
                <button className="chip" style={{ color: "#b91c1c" }} onClick={() => removeWish(i.slug)}>O&apos;chirish</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
