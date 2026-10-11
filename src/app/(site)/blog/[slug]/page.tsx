import Link from "@/components/LLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { HeroCover } from "@/components/Cover";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { IconChevron } from "@/components/Icons";
import { getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await db.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, isPublished: true },
  });
  // Don't leak draft titles/excerpts via 404 metadata.
  return p && p.isPublished
    ? {
        title: p.title,
        description: p.excerpt ?? undefined,
        alternates: { canonical: `/blog/${slug}` },
        ...(locale === "ru" ? { robots: { index: false, follow: true } } : {}),
      }
    : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.article.findUnique({ where: { slug } });
  if (!p || !p.isPublished) notFound();
  const locale = await getLocale();
  const t = DICTS[locale].blog;
  const typeLabel = DICTS[locale].home.postType;

  return (
    <article className="container">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <nav className="crumbs" aria-label={t.crumbs}>
          <Link href="/blog">{t.eyebrow}</Link>
          <IconChevron />
          <span>{typeLabel[p.type] ?? typeLabel.blog}</span>
        </nav>
        {t.langNote && <p className="muted" style={{ marginTop: 16 }}>{t.langNote}</p>}
        <div lang="uz">
        <header style={{ padding: "32px 0 36px" }}>
          <h1 className="display" style={{ fontSize: "clamp(40px, 5.4vw, 72px)" }}>{p.title}</h1>
          {p.excerpt && <p className="lead" style={{ marginTop: 20 }}>{p.excerpt}</p>}
          <div className="label" style={{ marginTop: 20 }}>{formatDate(p.publishedAt, locale)} · {p.author}</div>
        </header>
        {p.coverImage && <HeroCover src={p.coverImage} alt={p.title} />}
        <div className="prose" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        </div>
        <div style={{ marginTop: 48 }}>
          <Link href="/blog" className="arrow-link">{t.all}</Link>
        </div>
      </div>
    </article>
  );
}
