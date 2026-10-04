import Link from "next/link";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { CATALOG_TAG } from "@/lib/stats";
import { getPairings } from "@/lib/pairs";
import { CardCover } from "@/components/Cover";
import { fetchCards, cardsFaceCSS, cardFontStyle, type CardFont } from "@/lib/queries";
import { CATEGORIES, CATEGORY_LABEL, styleFamily, webfontUrl } from "@/lib/fonts";
import { formatDate, formatNumber } from "@/lib/format";
import FontCard from "@/components/FontCard";
import { PreviewText } from "@/components/PreviewProvider";
import HeroRotator from "@/components/home/HeroRotator";
import HeroTypebar from "@/components/home/HeroTypebar";
import { IconArrow, IconArrowUR } from "@/components/Icons";

// Rendered per request (featured fonts are picked at random), but the data
// behind it is cached for 5 minutes: the DB sits in another region.
export const dynamic = "force-dynamic";

const getHomeData = unstable_cache(
  async () => {
    const [newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps, pairings] = await Promise.all([
      fetchCards({ where: PUBLIC_FAMILY, orderBy: [{ isNew: "desc" }, { popularity: "desc" }, { name: "asc" }], take: 6 }),
      db.article.findMany({
        where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 3,
        select: { id: true, slug: true, type: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
      }),
      db.family.count({ where: PUBLIC_FAMILY }),
      db.style.count({ where: { family: PUBLIC_FAMILY } }),
      db.family.count({ where: { ...PUBLIC_FAMILY, hasCyrillic: true } }),
      fetchCards({ where: { ...PUBLIC_FAMILY, hasLatin: true, styleCount: { gte: 3 } }, orderBy: [{ popularity: "desc" }, { name: "asc" }], take: 40 }),
      db.family.groupBy({ by: ["category"], where: PUBLIC_FAMILY, _count: true }),
      Promise.all(CATEGORIES.map((c) => fetchCards({ where: { ...PUBLIC_FAMILY, category: c }, orderBy: [{ popularity: "desc" }, { name: "asc" }], take: 1 }))),
      getPairings(),
    ]);
    return { newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps: catReps.map((r) => r[0] ?? null), pairings: pairings.slice(0, 2) };
  },
  ["home-data-v2"],
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

const TYPE_LABEL: Record<string, string> = { blog: "Blog", news: "Yangilik", article: "Maqola" };

export default async function HomePage() {
  const { newest, posts, families, styles, cyrillic, showcasePool, catCounts, catReps, pairings } = await getHomeData();

  // One family per category gives the rotating headline its range of voices.
  const rotator = catReps.filter((c): c is CardFont => !!c && c.hasLatin && c.category !== "Dingbat");
  const rotSlugs = new Set(rotator.map((r) => r.slug));
  const featuredPool = showcasePool.filter((c) => !rotSlugs.has(c.slug));
  const featured = pick(featuredPool.length >= 4 ? featuredPool : showcasePool, 4);
  const countOf = (c: string) => catCounts.find((x) => x.category === c)?._count ?? 0;
  const tiles = CATEGORIES.map((c, i) => ({ cat: c, rep: catReps[i], n: countOf(c) })).filter((t) => t.n > 0 && t.rep);

  const cards = [...rotator, ...featured, ...newest, ...tiles.map((t) => t.rep!)];
  const pairCuts = pairings.flatMap((p) => [p.heading, p.body]);
  const faceCSS =
    cardsFaceCSS(cards) +
    pairCuts.map((c) => `@font-face{font-family:"${styleFamily(c.slug, c.style)}";src:url("${webfontUrl(c.slug, c.style)}") format("woff2");font-weight:${c.weight};font-style:${c.italic ? "italic" : "normal"};font-display:swap;}`).join("");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />

      {/* Hero */}
      <section className="container hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Bepul shriftlar kutubxonasi</div>
            <HeroRotator
              lead="Brendingizga ovoz beradigan"
              word="shriftlar"
              fonts={rotator.map((r) => ({ slug: r.slug, name: r.name, weight: r.previewWeight, italic: r.previewItalic }))}
            />
          </div>
          <div className="hero-side">
            <p className="lead">
              Oʻzbek lotin va kirill yozuvini qoʻllab-quvvatlaydigan shriftlar. Sinab koʻring, solishtiring
              va bir bosishda yuklab oling — hammasi bepul.
            </p>
            <div className="hero-cta">
              <Link href="/fonts" className="btn btn-accent btn-lg">Shriftlarni koʻrish <IconArrow className="ico" /></Link>
              <Link href="/pairs" className="btn btn-lg">Juftliklar</Link>
            </div>
          </div>
        </div>
        <div className="typebar-wrap"><HeroTypebar /></div>
        <dl className="hero-facts">
          <div><dt className="sr-only">Shrift oilalari</dt><dd style={{ margin: 0 }}><b>{formatNumber(families)}</b><span>shrift oilasi</span></dd></div>
          <div><dt className="sr-only">Uslublar</dt><dd style={{ margin: 0 }}><b>{formatNumber(styles)}</b><span>uslub va kesim</span></dd></div>
          <div><dt className="sr-only">Kirill</dt><dd style={{ margin: 0 }}><b>{formatNumber(cyrillic)}</b><span>kirill yozuvli oila</span></dd></div>
          <div><dt className="sr-only">Narx</dt><dd style={{ margin: 0 }}><b>0 soʻm</b><span>har bir yuklab olish</span></dd></div>
        </dl>
      </section>

      {/* Featured specimens */}
      {featured.length > 0 && (
        <section className="container section" aria-labelledby="featured-h">
          <div className="section-head">
            <div>
              <h2 id="featured-h">Tanlangan shriftlar</h2>
              <p>Yuqorida yozgan matningiz shu yerda — har bir shriftda jonlanadi.</p>
            </div>
            <Link href="/fonts" className="arrow-link">Barcha shriftlar <IconArrow /></Link>
          </div>
          <div className="specs">
            {featured.map((f, i) => (
              <article className="spec-row" key={f.slug}>
                <div className="spec-meta">
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="spec-name"><Link href={`/fonts/${f.slug}`}>{f.name}</Link></h3>
                  <span className="spec-sub">{CATEGORY_LABEL[f.category] ?? f.category} · {f.styleCount} uslub</span>
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
            <h2 id="cats-h">Kategoriyalar</h2>
          </div>
          <div className="cat-grid">
            {tiles.map((t) => (
              <Link key={t.cat} href={`/fonts?cat=${t.cat}`} className="cat-tile">
                <span className="cat-aa" style={cardFontStyle(t.rep!)} aria-hidden="true">Aa</span>
                <span>
                  <span className="cat-foot">
                    <span className="cat-name">{CATEGORY_LABEL[t.cat]}</span>
                    <span className="cat-n">{formatNumber(t.n)}</span>
                  </span>
                  <span className="cat-from">{t.rep!.name}</span>
                </span>
              </Link>
            ))}
            <Link href="/fonts" className="cat-tile all" style={{ "--span4": 4 - (tiles.length % 4), "--span2": 2 - (tiles.length % 2) } as React.CSSProperties}>
              <span className="cat-aa" aria-hidden="true">A–Z</span>
              <span>
                <span className="cat-foot">
                  <span className="cat-name">Barcha shriftlar</span>
                  <span className="cat-n">{formatNumber(families)}</span>
                </span>
                <span className="cat-from">Katalogni ochish →</span>
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Newest */}
      {newest.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0 }} aria-labelledby="new-h">
          <div className="section-head">
            <h2 id="new-h">Yangi qoʻshilganlar</h2>
            <Link href="/fonts?sort=new" className="arrow-link">Hammasi <IconArrow /></Link>
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
            <div className="eyebrow">Oʻzbek tili uchun</div>
            <h2 id="uz-h">Har bir harf joyida.</h2>
            <p>
              Oʻzbek lotin yozuvi “oʻ” va “gʻ” uchun maxsus ʻ belgisini, kirill esa Ў, Қ, Ғ, Ҳ harflarini talab qiladi.
              Feekr har bir shriftni shu belgilar boʻyicha tekshiradi va sahifasida ochiq koʻrsatadi.
            </p>
            <ul className="uz-list">
              <li>Shrift sahifasida lotin va kirill qoʻllab-quvvatlanishi belgilab qoʻyilgan</li>
              <li>Sinash maydonida tayyor oʻzbekcha namunalar — lotin va kirillda</li>
              <li>Katalogda faqat kirill yozuvli shriftlarni saralash mumkin</li>
            </ul>
            <Link href="/fonts?cyr=1" className="btn btn-primary">Kirill yozuvli shriftlar <IconArrow className="ico" /></Link>
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
              <h2 id="pairs-h">Shrift juftliklari</h2>
              <p>Sarlavha va matn uchun tayyor kombinatsiyalar.</p>
            </div>
            <Link href="/pairs" className="arrow-link">Barcha juftliklar <IconArrow /></Link>
          </div>
          <div className="pairs-grid">
            {pairings.map((p) => (
              <article className="pair-card" key={p.id}>
                <div className="pair-tag">{p.label}</div>
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

      {/* Journal */}
      {posts.length > 0 && (
        <section className="container section cv" style={{ paddingTop: 0, paddingBottom: 0 }} aria-labelledby="blog-h">
          <div className="section-head">
            <h2 id="blog-h">Jurnal</h2>
            <Link href="/blog" className="arrow-link">Barcha maqolalar <IconArrow /></Link>
          </div>
          <div className="posts">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
                {p.coverImage ? <CardCover src={p.coverImage} alt="" /> : <div className="post-cover typo" aria-hidden="true">{[...p.title][0]}</div>}
                <div className="post-body">
                  <span className="label">{TYPE_LABEL[p.type] ?? "Blog"}</span>
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <span className="post-date">{formatDate(p.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
