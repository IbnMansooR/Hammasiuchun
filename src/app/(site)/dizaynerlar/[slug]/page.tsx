import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PUBLIC_FAMILY } from "@/lib/license";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/site";
import { KIND_LABEL, getPublishedWorks, splitLines, splitTags } from "@/lib/works";
import { fetchCards, cardsFaceCSS } from "@/lib/queries";
import FontCard from "@/components/FontCard";
import { IconArrow, IconArrowUR, IconChevron } from "@/components/Icons";

const abs = (u: string) => (u.startsWith("/") ? `${SITE_URL}${u}` : u);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const w = await db.work.findUnique({
    where: { slug },
    select: { title: true, summary: true, coverImage: true, isPublished: true, kind: true, authorName: true },
  });
  if (!w || !w.isPublished) return {};
  const description = w.summary ?? (w.kind === "partner" && w.authorName ? `${w.authorName} ishi — Feekr’ning “Dizaynerlar” boʻlimida.` : undefined);
  return {
    title: w.title,
    description,
    alternates: { canonical: `/dizaynerlar/${slug}` },
    openGraph: { title: w.title, description, type: "article", images: w.coverImage ? [{ url: abs(w.coverImage) }] : undefined },
    twitter: { card: w.coverImage ? "summary_large_image" : "summary" },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await db.work.findUnique({ where: { slug } });
  // Drafts are visible to a signed-in admin only (preview before publishing).
  if (!w || (!w.isPublished && !(await getSession()))) notFound();

  const images = splitLines(w.images);
  const gallery = images.filter((u) => u !== w.coverImage);
  const tags = splitTags(w.tags);
  const fontSlugs = splitTags(w.fonts);

  const [media, fonts, published] = await Promise.all([
    // Known pixel sizes let every image reserve its space (no layout shift).
    db.media.findMany({ where: { url: { in: [w.coverImage, ...gallery].filter((u): u is string => !!u) } }, select: { url: true, width: true, height: true } }),
    fontSlugs.length ? fetchCards({ where: { ...PUBLIC_FAMILY, slug: { in: fontSlugs } } }) : Promise.resolve([]),
    getPublishedWorks(),
  ]);
  const dims = new Map(media.map((m) => [m.url, m.width && m.height ? { width: m.width, height: m.height } : undefined]));
  const i = published.findIndex((x) => x.slug === w.slug);
  const next = published.length > 1 ? published[(i + 1) % published.length] : undefined;
  const partner = w.kind === "partner";
  const facts: { k: string; v: React.ReactNode }[] = [
    partner && w.authorName ? { k: "Muallif", v: w.authorUrl ? <a className="link" href={w.authorUrl} target="_blank" rel="noreferrer noopener">{w.authorName}</a> : w.authorName } : null,
    !partner && w.authorName ? { k: "Muallif", v: w.authorName } : null,
    w.client ? { k: "Mijoz", v: w.client } : null,
    w.year ? { k: "Yil", v: String(w.year) } : null,
    tags.length ? { k: "Yoʻnalish", v: tags.join(", ") } : null,
  ].filter((x) => x !== null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: w.title,
    description: w.summary ?? undefined,
    image: w.coverImage ? abs(w.coverImage) : undefined,
    dateCreated: w.year ? String(w.year) : undefined,
    creator: w.authorName ? { "@type": partner ? "Person" : "Organization", name: w.authorName, url: w.authorUrl ?? undefined } : { "@type": "Organization", name: "Feekr" },
    url: `${SITE_URL}/dizaynerlar/${w.slug}`,
  };

  return (
    <article className="container work">
      {fonts.length > 0 && <style dangerouslySetInnerHTML={{ __html: cardsFaceCSS(fonts) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav className="crumbs" aria-label="Yoʻl">
        <Link href="/dizaynerlar">Dizaynerlar</Link>
        <IconChevron />
        <span>{KIND_LABEL[w.kind] ?? "Ish"}</span>
      </nav>

      {!w.isPublished && <p className="alert alert-warn" role="note" style={{ marginTop: 16 }}>Qoralama — faqat siz (admin) koʻryapsiz.</p>}

      <header className="work-head">
        <div>
          {partner && <span className="tag tag-warn">Hamkor ishi</span>}
          <h1>{w.title}</h1>
          {w.summary && <p className="lead">{w.summary}</p>}
        </div>
        {facts.length > 0 && (
          <dl className="work-facts">
            {facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}
          </dl>
        )}
      </header>

      {w.coverImage && (
        <figure className="work-cover">
          <img src={w.coverImage} alt={w.title} {...dims.get(w.coverImage)} fetchPriority="high" decoding="async" />
        </figure>
      )}

      {w.body && <div className="prose work-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(w.body) }} />}

      {gallery.length > 0 && (
        <div className="work-gallery">
          {gallery.map((u, n) => {
            const d = dims.get(u);
            // Portrait art would run several screens tall at full width: cap its
            // height (the known ratio keeps the reserved box exact) and centre it.
            const tall = d && d.height > d.width * 1.05;
            return (
              <figure key={u} className={tall ? "is-tall" : undefined} style={tall ? ({ "--ar": d.height / d.width } as React.CSSProperties) : undefined}>
                <img src={u} alt={`${w.title} — ${n + 2}`} {...d} loading="lazy" decoding="async" />
              </figure>
            );
          })}
        </div>
      )}

      {partner && (
        <aside className="work-partner">
          <p>
            Bu ish {w.authorName ? <b>{w.authorName}</b> : "hamkor dizayner"} tomonidan yaratilgan va Feekr’ning “Dizaynerlar” boʻlimida hamkorlik asosida koʻrsatilmoqda.
          </p>
          {w.authorUrl && (
            <a className="btn" href={w.authorUrl} target="_blank" rel="noreferrer noopener">
              Muallif portfoliosi <IconArrowUR className="ico" />
            </a>
          )}
        </aside>
      )}

      {fonts.length > 0 && (
        <section className="fsec" aria-labelledby="h-fonts">
          <div className="section-head"><h2 id="h-fonts">Ishlatilgan shriftlar</h2></div>
          <div className="fgrid">{fonts.map((f) => <FontCard key={f.slug} f={f} />)}</div>
        </section>
      )}

      {next && next.slug !== w.slug && (
        <Link href={`/dizaynerlar/${next.slug}`} className="work-next">
          <span className="label">Keyingi ish</span>
          <span className="work-next-title">{next.title} <IconArrow /></span>
        </Link>
      )}
    </article>
  );
}
