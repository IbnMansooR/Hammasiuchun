import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { PUBLIC_FAMILY } from "@/lib/license";
import { DOWNLOADS_SHOWN_FROM } from "@/lib/stats";

export const metadata = { title: "Admin — Boshqaruv" };

export default async function Dashboard() {
  const [families, publicFamilies, styles, articles, media, drafts, recent, newOrders, dl] = await Promise.all([
    db.family.count(),
    db.family.count({ where: PUBLIC_FAMILY }),
    db.style.count(),
    db.article.count(),
    db.media.count(),
    db.article.count({ where: { isPublished: false } }),
    db.article.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    db.order.count({ where: { status: "new" } }),
    db.family.aggregate({ _sum: { downloads: true } }),
  ]);
  const downloads = dl._sum.downloads ?? 0;
  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Boshqaruv paneli</h1>
        <Link href="/admin/articles/new" className="btn btn-accent btn-sm">+ Yangi maqola</Link>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="n">{formatNumber(publicFamilies)}</div><div className="l">Saytda (jami {formatNumber(families)})</div></div>
        <div className="stat"><div className="n">{formatNumber(downloads)}</div><div className="l">Yuklab olishlar{downloads < DOWNLOADS_SHOWN_FROM ? ` (saytda ${DOWNLOADS_SHOWN_FROM} dan keyin koʻrinadi)` : ""}</div></div>
        <div className="stat"><div className="n">{formatNumber(styles)}</div><div className="l">Uslub</div></div>
        <div className="stat"><div className="n">{articles}</div><div className="l">Maqola ({drafts} qoralama)</div></div>
        <div className="stat"><div className="n">{media}</div><div className="l">Rasm</div></div>
        <div className="stat"><div className="n">{newOrders}</div><div className="l">Yangi buyurtma</div></div>
      </div>

      {families > publicFamilies && (
        <p style={{ background: "#fff7e6", color: "#7a4b00", padding: "12px 14px", borderRadius: 10, fontSize: 14, margin: "0 0 22px" }}>
          {formatNumber(families - publicFamilies)} ta oila saytda koʻrinmaydi — litsenziyasi bepul tarqatishga ruxsat bermaydi yoki tekshirilmagan.{" "}
          <Link href="/admin/fonts?view=hidden" style={{ textDecoration: "underline" }}>Roʻyxatni koʻrish</Link>. Oʻzingizniki yoki ruxsati bor
          oilalarni tahrirlash sahifasida “Oʻz shriftimiz” / “Tarqatish huquqi tasdiqlangan” qilib belgilang.
        </p>
      )}

      <h2 style={{ fontSize: 20, margin: "10px 0 14px" }}>Soʻnggi maqolalar</h2>
      <table className="adm-table">
        <thead><tr><th>Sarlavha</th><th>Turi</th><th>Holat</th><th>Yangilangan</th></tr></thead>
        <tbody>
          {recent.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/admin/articles/${a.id}`}>{a.title}</Link></td>
              <td>{a.type}</td>
              <td>{a.isPublished ? <span className="badge badge-free">Chop etilgan</span> : <span className="badge">Qoralama</span>}</td>
              <td>{formatDate(a.updatedAt)}</td>
            </tr>
          ))}
          {recent.length === 0 && <tr><td colSpan={4} className="muted">Hali maqola yoʻq.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
