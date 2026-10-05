"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <div className="empty" style={{ paddingBlock: "96px 40px" }}>
        <h1 className="display" style={{ fontSize: "clamp(40px, 6vw, 80px)", marginBottom: 16 }}>Nimadir notoʻgʻri ketdi</h1>
        <p>Sahifani yuklashda kutilmagan xatolik yuz berdi. Qaytadan urinib koʻring.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-accent btn-lg" onClick={() => reset()}>Qaytadan urinish</button>
          <Link href="/" className="btn btn-lg">Bosh sahifa</Link>
        </div>
      </div>
    </div>
  );
}
