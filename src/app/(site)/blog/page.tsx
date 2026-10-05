import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CardCover } from "@/components/Cover";

export const metadata = { title: "Jurnal", description: "Tipografika, shriftlar va Feekr yangiliklari haqida maqolalar.", alternates: { canonical: "/blog" } };

const TABS: { key: string; label: string }[] = [
  { key: "", label: "Hammasi" },
  { key: "article", label: "Maqolalar" },
  { key: "blog", label: "Blog" },
  { key: "news", label: "Yangiliklar" },
];

const TYPE_LABEL: Record<string, string> = { blog: "Blog", news: "Yangilik", article: "Maqola" };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: rawType = "" } = await searchParams;
  const type = TABS.some((t) => t.key === rawType) ? rawType : "";
  const posts = await db.article.findMany({
    where: { isPublished: true, ...(type ? { type } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    // Only the fields the card needs (skip the heavy markdown `body` column).
    select: { id: true, slug: true, type: true, title: true, excerpt: true, coverImage: true, author: true, publishedAt: true },
    take: 60,
  });

  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">Jurnal</div>
        <h1>Harflar haqida hikoyalar</h1>
        <p className="lead">Tipografika boʻyicha maqolalar, maslahatlar va Feekr yangiliklari.</p>
      </header>

      <nav className="chips" aria-label="Turlar" style={{ marginBottom: 28 }}>
        {TABS.map((t) => (
          <Link key={t.key} href={t.key ? `/blog?type=${t.key}` : "/blog"} className={`chip${type === t.key ? " active" : ""}`} aria-current={type === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className="empty">
          <div className="display">Hozircha maqola yoʻq</div>
          <p>Tez orada bu yerda tipografika haqidagi maqolalar paydo boʻladi.</p>
        </div>
      ) : (
        <div className="posts">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
              {p.coverImage ? <CardCover src={p.coverImage} alt="" /> : <div className="post-cover typo" aria-hidden="true">{[...p.title][0]}</div>}
              <div className="post-body">
                <span className="label">{TYPE_LABEL[p.type] ?? "Blog"}</span>
                <h2>{p.title}</h2>
                {p.excerpt && <p>{p.excerpt}</p>}
                <span className="post-date">{formatDate(p.publishedAt)} · {p.author}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
