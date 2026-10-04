import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { HeroCover } from "@/components/Cover";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, isPublished: true },
  });
  // Don't leak draft titles/excerpts via 404 metadata.
  return p && p.isPublished
    ? { title: p.title, description: p.excerpt ?? undefined, alternates: { canonical: `/blog/${slug}` } }
    : {};
}

const TYPE_LABEL: Record<string, string> = { blog: "Blog", news: "Yangilik", article: "Maqola" };

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.article.findUnique({ where: { slug } });
  if (!p || !p.isPublished) notFound();

  return (
    <article className="container section" style={{ paddingTop: 30 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/blog" className="fcard-tags">← Jurnal</Link>
        <div style={{ margin: "16px 0 10px" }}>
          <span className="badge">{TYPE_LABEL[p.type] ?? "Blog"}</span>
        </div>
        <h1 style={{ fontSize: "clamp(30px,4.5vw,56px)", lineHeight: 1.05 }}>{p.title}</h1>
        <div className="muted" style={{ margin: "16px 0 26px", fontSize: 14 }}>
          {formatDate(p.publishedAt)} · {p.author}
        </div>
        {p.coverImage && <HeroCover src={p.coverImage} alt={p.title} />}
        <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      </div>
    </article>
  );
}
