import Link from "@/components/LLink";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CardCover } from "@/components/Cover";
import { getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

// Articles are written in Uzbek: the Russian list is for visitors, not a second copy for search engines.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = DICTS[locale].blog;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: "/blog" },
    ...(locale === "ru" ? { robots: { index: false, follow: true } } : {}),
  };
}

const TABS = ["", "article", "blog", "news"];

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: rawType = "" } = await searchParams;
  const locale = await getLocale();
  const t = DICTS[locale].blog;
  const typeLabel = DICTS[locale].home.postType;
  const type = TABS.includes(rawType) ? rawType : "";
  const posts = await db.article.findMany({
    where: { isPublished: true, ...(type ? { type } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    // Only the fields the card needs (skip the heavy markdown `body` column).
    select: { id: true, slug: true, type: true, title: true, excerpt: true, titleRu: true, excerptRu: true, bodyRu: true, coverImage: true, author: true, publishedAt: true },
    take: 60,
  });

  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
        {t.langNote && <p className="muted">{t.langNote}</p>}
      </header>

      <nav className="chips" aria-label={t.tabsLabel} style={{ marginBottom: 28 }}>
        {TABS.map((k) => (
          <Link key={k} href={k ? `/blog?type=${k}` : "/blog"} className={`chip${type === k ? " active" : ""}`} aria-current={type === k ? "page" : undefined}>
            {t.tabs[k]}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className="empty">
          <div className="display">{t.empty}</div>
          <p>{t.emptyText}</p>
        </div>
      ) : (
        <div className="posts">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
              <CardCover src={p.coverImage || `/api/cover/${p.slug}${locale === "ru" && p.bodyRu ? "?l=ru" : ""}`} alt="" />
              <div className="post-body">
                <span className="label">{typeLabel[p.type] ?? typeLabel.blog}</span>
                <h2 lang={locale === "ru" && p.bodyRu ? "ru" : "uz"}>{(locale === "ru" && p.bodyRu && p.titleRu) || p.title}</h2>
                {(locale === "ru" && p.bodyRu ? p.excerptRu : p.excerpt) && <p lang={locale === "ru" && p.bodyRu ? "ru" : "uz"}>{locale === "ru" && p.bodyRu ? p.excerptRu : p.excerpt}</p>}
                <span className="post-date">{formatDate(p.publishedAt, locale)} · {p.author}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
