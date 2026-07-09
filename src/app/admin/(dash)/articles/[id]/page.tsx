import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ArticleForm from "@/components/ArticleForm";

export const metadata = { title: "Admin — Maqolani tahrirlash" };

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound(); // non-numeric id → 404, not a 500
  const article = await db.article.findUnique({ where: { id: n } });
  if (!article) notFound();
  return (
    <>
      <div className="adm-head">
        <h1 style={{ margin: 0 }}>Maqolani tahrirlash</h1>
        {article.isPublished && <a href={`/blog/${article.slug}`} target="_blank" className="btn btn-sm">↗ Ko&apos;rish</a>}
      </div>
      <ArticleForm article={article} />
    </>
  );
}
