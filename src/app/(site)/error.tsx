"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container section" style={{ paddingTop: 60, textAlign: "center" }}>
      <div className="eyebrow" style={{ justifyContent: "center" }}>Xatolik</div>
      <h1 style={{ fontSize: "clamp(30px,5vw,56px)", marginBottom: 14 }}>Nimadir notoʻgʻri ketdi</h1>
      <p className="muted" style={{ fontSize: 17, maxWidth: 460, margin: "0 auto 26px" }}>
        Sahifani yuklashda kutilmagan xatolik yuz berdi. Qaytadan urinib koʻring.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <button className="btn btn-accent" onClick={() => reset()}>Qaytadan urinish</button>
        <Link href="/" className="btn">Bosh sahifa</Link>
      </div>
    </div>
  );
}
