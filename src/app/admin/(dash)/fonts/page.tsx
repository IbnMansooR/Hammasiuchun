import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import { PUBLIC_FAMILY, isPublicFamily } from "@/lib/license";

export const metadata = { title: "Admin — Shriftlar" };
const PER = 30;

export default async function AdminFonts({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; view?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const searchQ = q.replace(/[%_]/g, "");
  const view = sp.view === "public" || sp.view === "hidden" ? sp.view : "";
  const reqPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.FamilyWhereInput = {
    ...(searchQ ? { name: { contains: searchQ, mode: "insensitive" } } : {}),
    ...(view === "public" ? PUBLIC_FAMILY : view === "hidden" ? { NOT: PUBLIC_FAMILY } : {}),
  };
  const total = await db.family.count({ where });
  const pages = Math.max(1, Math.ceil(total / PER));
  const page = Math.min(reqPage, pages);
  const rows = await db.family.findMany({ where, orderBy: { name: "asc" }, take: PER, skip: (page - 1) * PER });

  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Shriftlar ({formatNumber(total)})</h1>
        <Link href="/admin/fonts/upload" className="btn btn-accent btn-sm">+ Shrift yuklash</Link>
      </div>

      <form style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input type="text" name="q" defaultValue={q} placeholder="Nomi boʻyicha qidirish…" aria-label="Qidirish"
          style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "9px 16px", width: "100%", maxWidth: 300, fontFamily: "inherit" }} />
        <select name="view" defaultValue={view} aria-label="Holat" className="sel">
          <option value="">Hammasi</option>
          <option value="public">Saytda koʻrinadi</option>
          <option value="hidden">Yashirin (litsenziya / chop etilmagan)</option>
        </select>
        <button className="btn btn-sm">Koʻrsatish</button>
      </form>

      <table className="adm-table">
        <thead><tr><th>Nomi</th><th>Toifa</th><th>Uslub</th><th>Litsenziya</th><th>Holat</th><th></th></tr></thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.slug}>
              <td><Link href={`/admin/fonts/${f.slug}`}><strong>{f.name}</strong></Link></td>
              <td>{f.category}</td>
              <td>{f.styleCount}</td>
              <td>{f.licenseClass}</td>
              <td>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {isPublicFamily(f) ? <span className="badge badge-free">Saytda</span> : <span className="badge">Yashirin</span>}
                  {f.isFeatured && <span className="badge badge-new">Tavsiya</span>}
                </div>
              </td>
              <td style={{ textAlign: "right" }}><Link href={`/admin/fonts/${f.slug}`} className="chip">Tahrirlash</Link></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">Hech narsa topilmadi.</td></tr>}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link href={`/admin/fonts?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), page: String(page - 1) })}`}>← Oldingi</Link>}
          <span className="cur">{page} / {pages}</span>
          {page < pages && <Link href={`/admin/fonts?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), page: String(page + 1) })}`}>Keyingi →</Link>}
        </div>
      )}
    </>
  );
}
