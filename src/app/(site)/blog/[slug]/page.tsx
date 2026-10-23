import Link from "@/components/LLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { HeroCover } from "@/components/Cover";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { IconChevron } from "@/components/Icons";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

/** A search result shows about 60 characters of title and 160 of description: cut at a word, not in the middle of one. */
const cut = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const p = await db.article.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, titleRu: true, excerptRu: true, bodyRu: true, coverImage: true, isPublished: true },
  });
  if (!p || !p.isPublished) return {}; // don't leak draft titles/excerpts via 404 metadata
  const ru = locale === "ru" && !!p.bodyRu;
  const title = cut((ru && p.titleRu) || p.title, 70);
  const description = cut((ru ? p.excerptRu : p.excerpt) ?? "", 160) || undefined;
  const image = p.coverImage || `/api/cover/${slug}${ru ? "?l=ru" : ""}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 675 }] },
    twitter: { card: "summary_large_image", images: [image] },
    // Translated: a real Russian page with its own address. Not yet: the Uzbek page stays the one in search.
    alternates: p.bodyRu ? await alternates(`/blog/${slug}`) : { canonical: `/blog/${slug}` },
    ...(locale === "ru" && !p.bodyRu ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.article.findUnique({ where: { slug } });
  if (!p || !p.isPublished) notFound();
  const locale = await getLocale();
  const t = DICTS[locale].blog;
  const typeLabel = DICTS[locale].home.postType;
  const ru = locale === "ru" && !!p.bodyRu;
  const title = (ru && p.titleRu) || p.title;
  const excerpt = ru ? p.excerptRu : p.excerpt;
  const body = ru ? p.bodyRu! : p.body;

  return (
    <article className="container">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <nav className="crumbs" aria-label={t.crumbs}>
          <Link href="/blog">{t.eyebrow}</Link>
          <IconChevron />
          <span>{typeLabel[p.type] ?? typeLabel.blog}</span>
        </nav>
        {t.langNote && !ru && <p className="muted" style={{ marginTop: 16 }}>{t.langNote}</p>}
        <div lang={ru ? "ru" : "uz"}>
        <header style={{ padding: "32px 0 36px" }}>
          <h1 className="display" style={{ fontSize: "clamp(40px, 5.4vw, 72px)" }}>{title}</h1>
          {excerpt && <p className="lead" style={{ marginTop: 20 }}>{excerpt}</p>}
          <div className="label" style={{ marginTop: 20 }}>{formatDate(p.publishedAt, locale)} · {p.author}</div>
        </header>
        {p.coverImage && <HeroCover src={p.coverImage} alt={title} />}
        {p.coverImage && p.sourceName && !p.coverImage.startsWith("/") && <p className="muted" style={{ margin: "-18px 0 24px", fontSize: 13 }}>{locale === "ru" ? "Фото" : "Rasm"}: {p.sourceName}</p>}
        <div className="prose" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        {p.sourceUrl && /^https?:\/\//.test(p.sourceUrl) && (
          <p className="source-note">
            <a className="btn btn-sm" href={p.sourceUrl} target="_blank" rel="noopener nofollow">{`${locale === "ru" ? "Оригинал" : "Asl maqolani oʻqish"}${p.sourceName ? ` · ${p.sourceName}` : ""} ↗`}</a>
          </p>
        )}
        </div>
        <div style={{ marginTop: 48 }}>
          <Link href="/blog" className="arrow-link">{t.all}</Link>
        </div>
      </div>
    </article>
  );
}
