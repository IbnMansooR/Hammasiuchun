"use client";
import { useStore } from "./StoreProvider";
import { FREEWARE_WARNING, LICENSE_NOTE } from "@/lib/license";

export default function DownloadBox({
  slug, name, styleCount, licenseClass,
}: {
  slug: string; name: string; styleCount: number; licenseClass: string;
}) {
  const { toggleWish, inWish, ready } = useStore();
  const wished = ready && inWish(slug);

  return (
    <div className="buybox">
      <div className="price">Bepul</div>
      <p className="muted" style={{ fontSize: 14, margin: "6px 0 18px" }}>
        Toʻliq oila — {styleCount} uslub, bitta ZIP faylda.
      </p>

      <a className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} href={`/api/download-family/${slug}`}>
        Butun oilani yuklab olish ({styleCount})
      </a>

      <button
        className={`btn${wished ? " btn-on" : ""}`}
        style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
        aria-pressed={wished}
        onClick={() => toggleWish({ slug, name })}
      >
        {wished ? "♥ Sevimlilarda" : "♡ Sevimlilarga qoʻshish"}
      </button>

      <div style={{ margin: "18px 0 0", fontSize: 13.5, color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <strong style={{ color: "var(--fg)" }}>Litsenziya:</strong> {LICENSE_NOTE[licenseClass] ?? licenseClass}
        {licenseClass === "Freeware" && (
          <p role="note" style={{ margin: "10px 0 0", padding: "10px 12px", borderRadius: 10, background: "#fff7e6", color: "#7a4b00", fontSize: 13 }}>
            {FREEWARE_WARNING}
          </p>
        )}
        <p style={{ margin: "10px 0 0", fontSize: 12.5 }}>ZIP ichida <code>LITSENZIYA.txt</code> — muallif va shartlar.</p>
      </div>
    </div>
  );
}
