import Link from "@/components/LLink";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { CATALOG_TAG, DOWNLOADS_SHOWN_FROM } from "@/lib/stats";
import { getPairings } from "@/lib/pairs";
import { CardCover } from "@/components/Cover";
import { fetchCards, cardsFaceCSS, cardFontStyle, type CardFont } from "@/lib/queries";
import { CATEGORIES, categoryLabel, styleFamily, webfontUrl } from "@/lib/fonts";
import { formatDate, formatNumber } from "@/lib/format";
import FontCard from "@/components/FontCard";
import WorkCard from "@/components/WorkCard";
import AdSlot from "@/components/AdSlot";
import { getPublishedWorks } from "@/lib/works";
import Facts from "@/components/Facts";
import { PreviewText } from "@/components/PreviewProvider";
import HeroRotator from "@/components/home/HeroRotator";
import HeroTypebar from "@/components/home/HeroTypebar";
import { IconArrow, IconArrowUR } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";
import { siteJsonLd } from "@/lib/seo";
import { getSiteSettingsCached } from "@/lib/settings";
import { getTgState } from "@/lib/tgState";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";
import type { Metadata } from "next";

// Rendered per request (featured fonts are picked at random), but the data
// behind it is cached for 5 minutes: the DB sits in another region.
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await alternates("/") };
}

const getHomeData = unstable_cache(
  async () => {
    const [newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps, pairings, dl, cyrReps, everyone] = await Promise.all([
      fetchCards({ where: PUBLIC_FAMILY, orderBy: [{ isNew: "desc" }, { popularity: "desc" }, { name: "asc" }], take: 6 }),
      db.article.findMany({
        where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 3,
        select: { id: true, slug: true, type: true, title: true, excerpt: true, titleRu: true, excerptRu: true, bodyRu: true, coverImage: true, publishedAt: true },
      }),
      db.family.count({ where: PUBLIC_FAMILY }),
      db.style.count({ where: { family: PUBLIC_FAMILY } }),
      db.family.count({ where: { ...PUBLIC_FAMILY, hasCyrillic: true } }),
      fetchCards({ where: { ...PUBLIC_FAMILY, hasLatin: true, styleCount: { gte: 3 } }, orderBy: [{ popularity: "desc" }, { name: "asc" }], take: 40 }),
      db.family.groupBy({ by: ["category"], where: PUBLIC_FAMILY, _count: true }),
      Promise.all(CATEGORIES.map((c) => fetchCards({ where: { ...PUBLIC_FAMILY, category: c }, orderBy: [{ popularity: "desc" }, { name: "asc" }], take: 1 }))),
      getPairings(),
      db.family.aggregate({ _sum: { downloads: true } }),
      // The Russian headline word is Cyrillic: rotate it through families that can draw it.
      Promise.all(CATEGORIES.map((c) => fetchCards({ where: { ...PUBLIC_FAMILY, category: c, hasCyrillic: true }, orderBy: [{ popularity: "desc" }, { name: "asc" }], take: 1 }))),
      // Every public family, for the rotating headline word.
      fetchCards({ where: { ...PUBLIC_FAMILY, category: { not: "Dingbat" } }, orderBy: { name: "asc" }, take: 1000 }),
    ]);
    return {
      newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps: catReps.map((r) => r[0] ?? null),
      cyrReps: cyrReps.map((r) => r[0] ?? null), everyone: everyone.filter((c) => c.previewStyleName), pairings: pairings.slice(0, 2), downloads: dl._sum.downloads ?? 0,
    };
  },
  ["home-data-v5"],
  { revalidate: 300, tags: [CATALOG_TAG] },
);

function pick<T>(arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default async function HomePage() {
  const [{ newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps, everyone, pairings, downloads }, allWorks, settings, tgState, locale] = await Promise.all([
    getHomeData(),
    getPublishedWorks(),
    getSiteSettingsCached().catch(() => null),
    getTgState(),
    getLocale(),
  ]);
  const t = DICTS[locale].home;
  const sameAs = [
    ...(settings?.socials ?? []).filter((s) => s.enabled && /^https:\/\//.test(s.url)).map((s) => s.url),
    ...(tgState.channel?.username ? [`https://t.me/${tgState.channel.username}`] : []),
  ];
  const works = allWorks.slice(0, 3);

  // The rotating headline word goes through every public family that can write it, in a new
  // random order on each visit. Only the first is declared here; the rest load as their turn comes.
  const rotator = pick(everyone.filter((c) => (locale === "ru" ? c.hasCyrillic : c.hasLatin)), everyone.length);
  const rotSlugs = new Set(rotator.slice(0, 1).map((r) => r.slug));
  const featuredPool = showcasePool.filter((c) => !rotSlugs.has(c.slug));
  const featured = pick(featuredPool.length >= 4 ? featuredPool : showcasePool, 4);
  const countOf = (c: string) => catCounts.find((x) => x.category === c)?._count ?? 0;
  const tiles = CATEGORIES.map((c, i) => ({ cat: c, rep: catReps[i], n: countOf(c) })).filter((t) => t.n > 0 && t.rep);

  const cards = [...rotator.slice(0, 1), ...featured, ...newest, ...tiles.map((t) => t.rep!)];
  const pairCuts = pairings.flatMap((p) => [p.heading, p.body]);
  const faceCSS =
    cardsFaceCSS(cards) +
    pairCuts.map((c) => `@font-face{font-family:"${styleFamily(c.slug, c.style)}";src:url("${webfontUrl(c.slug, c.style)}") format("woff2");font-weight:${c.weight};font-style:${c.italic ? "italic" : "normal"};font-display:swap;}`).join("");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <JsonLd data={siteJsonLd(sameAs)} />

      {/* Hero */}
      <section className="container hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <HeroRotator
              lead={t.lead}
              word={t.word}
              fonts={rotator.map((r) => ({ slug: r.slug, name: r.name, style: r.previewStyleName, weight: r.previewWeight, italic: r.previewItalic }))}
            />
          </div>
          <div className="hero-side">
            <p className="lead">{t.intro}</p>
            <div className="hero-cta">
              <Link href="/fonts" className="btn btn-accent btn-lg">{t.seeFonts} <IconArrow className="ico" /></Link>
              <Link href="/pairs" className="btn btn-lg">{t.pairs}</Link>
            </div>
          </div>
        </div>
        <div className="typebar-wrap"><HeroTypebar /></div>
        <Facts items={[
          [formatNumber(families), t.factFamilies(families)],
          [formatNumber(styles), t.factStyles(styles)],
          [formatNumber(cyrillic), t.factCyr(cyrillic)],
          ...(downloads >= DOWNLOADS_SHOWN_FROM ? [[formatNumber(downloads), t.factDownloads(downloads)] as [string, string]] : []),
        ]} />
      </section>

      {/* Featured specimens */}
      {featured.length > 0 && (
        <section className="container section" aria-labelledby="featured-h">
          <div className="section-head">
            <div>
              <h2 id="featured-h">{t.featured}</h2>
              <p>{t.featuredSub}</p>
            </div>
            <Link href="/fonts" className="arrow-link">{t.allFonts} <IconArrow /></Link>
          </div>
          <div className="specs">
            {featured.map((f, i) => (
              <article className="spec-row" key={f.slug}>
                <div className="spec-meta">
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="spec-name"><Link href={`/fonts/${f.slug}`}>{f.name}</Link></h3>
                  <span className="spec-sub">{categoryLabel(f.category, locale)} · {DICTS[locale].card.styles(f.styleCount)}</span>
                </div>
                <PreviewText className="spec-text" style={cardFontStyle(f)} fallback={f.name} />
                <span className="spec-go" aria-hidden="true"><IconArrowUR /></span>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {tiles.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="cats-h">
          <div className="section-head">
            <h2 id="cats-h">{t.categories}</h2>
          </div>
          <div className="cat-grid">
            {tiles.map((tile) => (
              <Link key={tile.cat} href={`/fonts?cat=${tile.cat}`} className="cat-tile">
                <span className="cat-aa" style={cardFontStyle(tile.rep!)} aria-hidden="true">{locale === "ru" && tile.rep!.hasCyrillic ? "Аа" : "Aa"}</span>
                <span>
                  <span className="cat-foot">
                    <span className="cat-name">{categoryLabel(tile.cat, locale)}</span>
                    <span className="cat-n">{formatNumber(tile.n)}</span>
                  </span>
                  <span className="cat-from">{tile.rep!.name}</span>
                </span>
              </Link>
            ))}
            <Link href="/fonts" className="cat-tile all" style={{ "--span4": 4 - (tiles.length % 4), "--span2": 2 - (tiles.length % 2) } as React.CSSProperties}>
              <span className="cat-aa" aria-hidden="true">A–Z</span>
              <span>
                <span className="cat-foot">
                  <span className="cat-name">{t.allFonts}</span>
                  <span className="cat-n">{formatNumber(families)}</span>
                </span>
                <span className="cat-from">{t.openCatalog}</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Newest */}
      {newest.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="new-h">
          <div className="section-head">
            <h2 id="new-h">{t.newest}</h2>
            <Link href="/fonts?sort=new" className="arrow-link">{t.all} <IconArrow /></Link>
          </div>
          <div className="fgrid">
            {newest.map((f) => <FontCard key={f.slug} f={f} />)}
          </div>
        </section>
      )}

      {/* Uzbek-first */}
      <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="uz-h">
        <div className="uz">
          <div>
            <div className="eyebrow">{t.uzEyebrow}</div>
            <h2 id="uz-h">{t.uzTitle}</h2>
            <p>{t.uzText}</p>
            <ul className="uz-list">
              {t.uzList.map((li) => <li key={li}>{li}</li>)}
            </ul>
            <Link href="/fonts?cyr=1" className="btn btn-primary">{t.uzCta} <IconArrow className="ico" /></Link>
          </div>
          <div className="uz-glyphs" aria-hidden="true">
            <div className="hl">Oʻ</div><div>gʻ</div><div>ʼ</div><div>Sh</div>
            <div>Ў</div><div>Қ</div><div>Ғ</div><div className="hl">Ҳ</div>
          </div>
        </div>
      </section>

      {/* Pairs */}
      {pairings.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="pairs-h">
          <div className="section-head">
            <div>
              <h2 id="pairs-h">{t.pairsTitle}</h2>
              <p>{t.pairsSub}</p>
            </div>
            <Link href="/pairs" className="arrow-link">{t.allPairs} <IconArrow /></Link>
          </div>
          <div className="pairs-grid">
            {pairings.map((p) => (
              <article className="pair-card" key={p.id}>
                <div className="pair-tag">{p.cats.map((c) => categoryLabel(c, locale)).join(" + ")}</div>
                <div className="pair-head" style={{ fontFamily: `"${styleFamily(p.heading.slug, p.heading.style)}", var(--font)`, fontWeight: p.heading.weight, fontStyle: p.heading.italic ? "italic" : "normal" }}>
                  {p.sampleHeading}
                </div>
                <p className="pair-body" style={{ fontFamily: `"${styleFamily(p.body.slug, p.body.style)}", var(--font)`, fontWeight: p.body.weight, fontStyle: p.body.italic ? "italic" : "normal" }}>
                  {p.sampleBody}
                </p>
                <div className="pair-meta">
                  <Link href={`/fonts/${p.heading.slug}`}><strong>{p.heading.name}</strong> {p.heading.style}</Link>
                  <span className="pair-plus" aria-hidden="true">+</span>
                  <Link href={`/fonts/${p.body.slug}`}><strong>{p.body.name}</strong> {p.body.style}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <AdSlot placement="home" />

      {/* Dizaynerlar */}
      {works.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="works-h">
          <div className="section-head">
            <div>
              <h2 id="works-h">{t.works}</h2>
              <p>{t.worksSub}</p>
            </div>
            <Link href="/dizaynerlar" className="arrow-link">{t.allWorks} <IconArrow /></Link>
          </div>
          <div className="pf-grid pf-grid-3">
            {works.map((w) => <WorkCard key={w.slug} w={w} />)}
          </div>
        </section>
      )}

      {/* Journal */}
      {posts.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0, paddingBottom: 0 }} aria-labelledby="blog-h">
          <div className="section-head">
            <h2 id="blog-h">{t.journal}</h2>
            <Link href="/blog" className="arrow-link">{t.allPosts} <IconArrow /></Link>
          </div>
          <div className="posts">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
                <CardCover src={p.coverImage || `/api/cover/${p.slug}${locale === "ru" && p.bodyRu ? "?l=ru" : ""}`} alt="" />
                <div className="post-body">
                  <span className="label">{t.postType[p.type] ?? t.postType.blog}</span>
                  <h3>{(locale === "ru" && p.bodyRu && p.titleRu) || p.title}</h3>
                  {(locale === "ru" && p.bodyRu ? p.excerptRu : p.excerpt) && <p>{locale === "ru" && p.bodyRu ? p.excerptRu : p.excerpt}</p>}
                  <span className="post-date">{formatDate(p.publishedAt, locale)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
