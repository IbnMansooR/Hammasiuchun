import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_FAMILY, REDISTRIBUTABLE } from "@/lib/license";
import { CardCover } from "@/components/Cover";
import { fetchCards, cardsFaceCSS, type CardFont } from "@/lib/queries";
import { cssFamily, UZ_SAMPLE, CATEGORIES, CATEGORY_LABEL } from "@/lib/fonts";
import { formatDate, formatNumber } from "@/lib/format";
import FontCard from "@/components/FontCard";

// Re-render on every request so the showcase suggests different fonts each time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [newest, posts, total, rnd] = await Promise.all([
    fetchCards({
      where: PUBLIC_FAMILY,
      orderBy: [{ isNew: "desc" }, { popularity: "desc" }, { name: "asc" }],
      take: 8,
    }),
    db.article.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.family.count({ where: PUBLIC_FAMILY }),
    // 2 random, decent-sized families for the showcase banners
    db.$queryRaw<{ slug: string }[]>`
      SELECT "slug" FROM "Family"
      WHERE "isPublished" = true AND "licenseClass" IN (${Prisma.join([...REDISTRIBUTABLE])})
        AND "hasLatin" = true AND "styleCount" >= 5
      ORDER BY RANDOM() LIMIT 2`,
  ]);

  const rndSlugs = rnd.map((r) => r.slug);
  const showcase = rndSlugs.length ? await fetchCards({ where: { slug: { in: rndSlugs } } }) : [];
  const bySlug = new Map(showcase.map((c) => [c.slug, c]));
  const hero = bySlug.get(rndSlugs[0]) ?? showcase[0] ?? newest[0];
  const dark = bySlug.get(rndSlugs[1]) ?? showcase[1] ?? newest[1] ?? hero;

  const faceMap = new Map<string, CardFont>();
  [hero, dark, ...newest].filter(Boolean).forEach((c) => faceMap.set(c.slug, c));
  const faceCSS = cardsFaceCSS([...faceMap.values()]);

  const catCounts = await db.family.groupBy({
    by: ["category"],
    where: PUBLIC_FAMILY,
    _count: true,
  });
  const countOf = (c: string) => catCounts.find((x) => x.category === c)?._count ?? 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />

      {/* Hero */}
      <section className="container" style={{ paddingTop: 28 }}>
        <div className="eyebrow">Mustaqil shrift ombori</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 76px)", maxWidth: 1000, letterSpacing: "-.03em" }}>
          Brendingizga ovoz beradigan shriftlar.
        </h1>
        <p className="muted" style={{ fontSize: 19, maxWidth: 620, marginTop: 18 }}>
          {formatNumber(total)} ta shrift oilasi — barchasi bepul. Sinab koʻring va bir bosishda
          yuklab oling.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
          <Link href="/fonts" className="btn btn-accent">Barcha shriftlar</Link>
          <Link href="/pairs" className="btn">Shrift juftliklari</Link>
        </div>
      </section>

      {/* Featured light showcase */}
      {hero && (
        <section className="container">
          <Link href={`/fonts/${hero.slug}`} className="showcase" style={{ display: "block" }}>
            <div className="showcase-meta">
              <h2>{hero.name}</h2>
              <div className="sub">{hero.tagline ?? "Tavsiya etilgan oila"}</div>
              <div className="sub">{hero.styleCount} uslub{hero.hasItalic ? " + Kursiv" : ""}</div>
              <span className="btn btn-sm">Ko&apos;rish</span>
            </div>
            <div className="showcase-specimens" style={{ fontFamily: `"${cssFamily(hero.slug)}", var(--font)`, fontWeight: hero.previewWeight }}>
              <div className="spec spec-alpha">AaBbCcDdEe</div>
              <div className="spec spec-pangram">{UZ_SAMPLE}.</div>
            </div>
          </Link>
        </section>
      )}

      {/* Second featured showcase (skip when it would duplicate the hero) */}
      {dark && dark.slug !== hero?.slug && (
        <section className="container">
          <Link href={`/fonts/${dark.slug}`} className="showcase" style={{ display: "block", paddingBottom: 40 }}>
            <div className="showcase-meta">
              <h2>{dark.name}</h2>
              <div className="sub">Sinab ko&apos;ring</div>
              <div className="sub">{dark.styleCount} uslub</div>
              <span className="btn btn-sm">Ko&apos;rish</span>
            </div>
            <div className="showcase-specimens" style={{ fontFamily: `"${cssFamily(dark.slug)}", var(--font)`, fontWeight: dark.previewWeight }}>
              <div className="spec spec-alpha">AaBbCcDdEe</div>
              <div className="spec spec-pangram">{UZ_SAMPLE}.</div>
            </div>
          </Link>
        </section>
      )}

      {/* Newest grid */}
      <section className="container section" style={{ paddingTop: 20 }}>
        <div className="section-head">
          <h2>Eng so&apos;nggi shriftlar</h2>
          <Link href="/fonts" className="btn btn-sm">Hammasi →</Link>
        </div>
        <div className="grid">
          {newest.map((f) => <FontCard key={f.slug} f={f} />)}
        </div>
      </section>

      {/* Categories */}
      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="section-head"><h2>Kategoriyalar</h2></div>
        <div className="toolbar">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/fonts?cat=${c}`} className="chip">
              {CATEGORY_LABEL[c]} <span className="muted" style={{ marginLeft: 6 }}>{countOf(c)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Blog teaser */}
      {posts.length > 0 && (
        <section className="container section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <h2>Jurnal</h2>
            <Link href="/blog" className="btn btn-sm">Blogga o&apos;tish →</Link>
          </div>
          <div className="grid cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="post-card">
                {p.coverImage ? <CardCover src={p.coverImage} alt={p.title} /> : <div className="post-cover" />}
                <div className="post-body">
                  <span className="badge">{p.type === "news" ? "Yangilik" : p.type === "article" ? "Maqola" : "Blog"}</span>
                  <h3>{p.title}</h3>
                  <p className="muted" style={{ margin: 0 }}>{p.excerpt}</p>
                  <span className="fcard-tags">{formatDate(p.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container">
        <div className="showcase dark" style={{ paddingBottom: 40, textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(28px,4vw,52px)", margin: "20px auto 14px", maxWidth: 720 }}>
            O&apos;z shriftingizni topdingizmi?
          </h2>
          <p style={{ color: "rgba(255,255,255,.65)", maxWidth: 520, margin: "0 auto 24px" }}>
            Butun katalogni ko&apos;rib chiqing va brendingizga mos oilani tanlang.
          </p>
          <Link href="/fonts" className="btn btn-light" style={{ marginBottom: 30, display: "inline-flex" }}>
            Katalogni ochish
          </Link>
        </div>
      </section>
    </>
  );
}
