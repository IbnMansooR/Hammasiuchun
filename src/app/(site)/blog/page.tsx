import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CardCover } from "@/components/Cover";

export const metadata = { title: "Blog" };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "Hammasi" },
  { key: "blog", label: "Blog" },
  { key: "news", label: "Yangiliklar" },
  { key: "article", label: "Maqolalar" },
];

const TYPE_LABEL: Record<string, string> = { blog: "Blog", news: "Yangilik", article: "Maqola" };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = "" } = await searchParams;
  const posts = await db.article.findMany({
    where: { isPublished: true, ...(type ? { type } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    // Only the fields the card needs (skip the heavy markdown `body` column).
    select: { id: true, slug: true, type: true, title: true, excerpt: true, coverImage: true, author: true, publishedAt: true },
    take: 60,
  });

  return (
    <div className="container section" style={{ paddingTop: 30 }}>
      <div className="eyebrow">Jurnal</div>
      <h1 style={{ fontSize: "clamp(32px,5vw,64px)", marginBottom: 24 }}>Blog va yangiliklar</h1>

      <div className="toolbar">
        {TABS.map((t) => (
          <Link key={t.key} href={t.key ? `/blog?type=${t.key}` : "/blog"}
            className={`chip${type === t.key ? " active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="muted" style={{ padding: "40px 0" }}>Hozircha maqola yo&apos;q.</p>
      ) : (
        <div className="grid cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
              {p.coverImage ? <CardCover src={p.coverImage} alt={p.title} /> : <div className="post-cover" />}
              <div className="post-body">
                <span className="badge">{TYPE_LABEL[p.type] ?? "Blog"}</span>
                <h3>{p.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{p.excerpt}</p>
                <span className="fcard-tags">{formatDate(p.publishedAt)} · {p.author}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
