import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Admin — Boshqaruv" };

export default async function Dashboard() {
  const [families, styles, articles, media, drafts, recent, newOrders] = await Promise.all([
    db.family.count(),
    db.style.count(),
    db.article.count(),
    db.media.count(),
    db.article.count({ where: { isPublished: false } }),
    db.article.findMany({ orderBy: { updatedAt: "desc" }, take: 5 }),
    db.order.count({ where: { status: "new" } }),
  ]);
  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Boshqaruv paneli</h1>
        <Link href="/admin/articles/new" className="btn btn-accent btn-sm">+ Yangi maqola</Link>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="n">{formatNumber(families)}</div><div className="l">Shrift oilasi</div></div>
        <div className="stat"><div className="n">{formatNumber(styles)}</div><div className="l">Uslub</div></div>
        <div className="stat"><div className="n">{articles}</div><div className="l">Maqola ({drafts} qoralama)</div></div>
        <div className="stat"><div className="n">{media}</div><div className="l">Rasm</div></div>
        <div className="stat"><div className="n">{newOrders}</div><div className="l">Yangi buyurtma</div></div>
      </div>

      <h2 style={{ fontSize: 20, margin: "10px 0 14px" }}>So&apos;nggi maqolalar</h2>
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
          {recent.length === 0 && <tr><td colSpan={4} className="muted">Hali maqola yo&apos;q.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
