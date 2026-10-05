import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { deleteArticleAction } from "../../actions";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Admin — Maqolalar" };

export default async function ArticlesList() {
  const posts = await db.article.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Maqolalar</h1>
        <Link href="/admin/articles/new" className="btn btn-accent btn-sm">+ Yangi</Link>
      </div>
      <table className="adm-table">
        <thead><tr><th>Sarlavha</th><th>Turi</th><th>Holat</th><th>Sana</th><th><span className="sr-only">Amallar</span></th></tr></thead>
        <tbody>
          {posts.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/admin/articles/${a.id}`}><strong>{a.title}</strong></Link><div className="muted" style={{ fontSize: 12 }}>/{a.slug}</div></td>
              <td>{a.type}</td>
              <td>{a.isPublished ? <span className="badge badge-free">Chop etilgan</span> : <span className="badge">Qoralama</span>}</td>
              <td>{formatDate(a.publishedAt ?? a.updatedAt)}</td>
              <td style={{ textAlign: "right" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Link href={`/admin/articles/${a.id}`} className="chip">Tahrirlash</Link>
                  <form action={deleteArticleAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton className="chip chip-danger" message="Maqola oʻchirilsinmi? Bu amalni qaytarib boʻlmaydi.">
                      Oʻchirish
                    </ConfirmButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {posts.length === 0 && <tr><td colSpan={5} className="muted">Hali maqola yoʻq.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
