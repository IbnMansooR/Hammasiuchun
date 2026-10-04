"use client";
import Link from "next/link";
import { useStore } from "@/components/StoreProvider";

export default function WishlistPage() {
  const { wish, removeWish, ready } = useStore();
  if (!ready) return <div className="container section" style={{ paddingTop: 40 }} />;

  return (
    <div className="container section" style={{ paddingTop: 34 }}>
      <h1 style={{ fontSize: "clamp(30px,4.5vw,52px)", marginBottom: 24 }}>Sevimlilar</h1>

      {wish.length === 0 ? (
        <div>
          <p className="muted" style={{ fontSize: 17 }}>Sevimlilar roʻyxati boʻsh. Shrift sahifasida ♡ tugmasini bosing.</p>
          <Link href="/fonts" className="btn btn-accent" style={{ marginTop: 16 }}>Shriftlarni koʻrish</Link>
        </div>
      ) : (
        <div>
          {wish.map((i) => (
            <div key={i.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
              <Link href={`/fonts/${i.slug}`} style={{ fontSize: 19, fontWeight: 700 }}>{i.name}</Link>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <a className="btn btn-sm btn-accent" href={`/api/download-family/${i.slug}`}>Yuklab olish</a>
                <button className="chip" style={{ color: "#b91c1c" }} onClick={() => removeWish(i.slug)}>Oʻchirish</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
