"use client";
import { useEffect } from "react";

// Last-resort boundary for errors thrown in the root/site layouts, where
// (site)/error.tsx cannot catch them. Must render its own <html>/<body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="uz">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: "#0b0b0c" }}>
        <title>Xatolik — Feekr</title>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 36, margin: "0 0 12px" }}>Nimadir notoʻgʻri ketdi</h1>
            <p style={{ color: "#64646b", margin: "0 0 24px" }}>Sahifani yuklashda kutilmagan xatolik yuz berdi. Qaytadan urinib koʻring.</p>
            <button
              onClick={() => reset()}
              style={{ background: "#0b7a55", color: "#fff", border: 0, borderRadius: 999, padding: "11px 22px", font: "inherit", cursor: "pointer" }}
            >
              Qaytadan urinish
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
