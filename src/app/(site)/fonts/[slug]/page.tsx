import Link from "@/components/LLink";
import type { Metadata } from "next";
import { preload } from "react-dom";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cssFamily, styleFamily, fontFaceCSS, fontFaceCSSPerStyle, previewStyle, uzSample, webfontUrl, categoryLabel } from "@/lib/fonts";
import { PUBLIC_FAMILY, isPublicFamily, licenseNote } from "@/lib/license";
import { getGlyphInfo, groupGlyphs, type GlyphSupport } from "@/lib/glyphSupport";
import { cardInclude, toCard, cardsFaceCSS } from "@/lib/cards";
import { formatNumber } from "@/lib/format";
import { WorkbenchProvider, Tester, StyleRows } from "@/components/specimen/Workbench";
import GlyphMap from "@/components/specimen/GlyphMap";
import Subnav from "@/components/specimen/Subnav";
import DownloadBox from "@/components/DownloadBox";
import FontCard from "@/components/FontCard";
import WorkCard from "@/components/WorkCard";
import { worksUsingFont } from "@/lib/works";
import { IconArrow, IconChevron } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";
import { fontJsonLd } from "@/lib/seo";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const f = await db.family.findUnique({ where: { slug }, select: { name: true, tagline: true, category: true, styleCount: true, hasCyrillic: true, isPublished: true, licenseClass: true } });
  // Don't leak unpublished/restricted family names via 404 metadata.
  return f && isPublicFamily(f)
    ? {
        // What people type: "<name> shrift", "shrift yuklab olish", "kirill shrift".
        title: { absolute: DICTS[locale].font.metaTitle(f.name) },
        description: fontDescription(f, locale),
        alternates: await alternates(`/fonts/${slug}`),
      }
    : {};
}

// The admin-written tagline/description are Uzbek: Russian pages use the generated Russian text.
function fontDescription(f: { name: string; tagline: string | null; category: string; styleCount: number; hasCyrillic: boolean }, locale: Locale): string {
  const base = DICTS[locale].font.desc(f.name, categoryLabel(f.category, locale), f.styleCount, f.hasCyrillic);
  return f.tagline && locale === "uz" ? `${f.tagline.replace(/[.\s]+$/, "")}. ${base}` : base;
}

function autoAbout(f: {
  name: string; category: string; styleCount: number; hasItalic: boolean; glyphs: number;
  designer: string | null; manufacturer: string | null;
}, locale: Locale): string {
  return DICTS[locale].font.autoAbout({
    name: f.name, cat: categoryLabel(f.category, locale), category: f.category, styles: f.styleCount,
    italic: f.hasItalic, glyphs: f.glyphs, designer: f.designer, manufacturer: f.manufacturer,
  });
}

function texts(support: GlyphSupport | null, cyrillicOnly: boolean, locale: Locale, hasCyrillic: boolean) {
  if (locale === "ru" && (support ? support.cyrillic : hasCyrillic)) {
    return {
      line: "Узбекистан — край идей, солнца и шрифтов",
      para: "Хороший шрифт не выставляет себя напоказ — он делает чтение лёгким. Расстояние между буквами, ритм слов и интерлиньяж вместе дают странице голос. Поэтому, выбирая шрифт, смотрите не только на заголовок, но и на длинный текст.",
    };
  }
  if (cyrillicOnly) {
    return {
      line: "Ўзбекистон — ғоялар, қуёш ва шрифтлар юрти",
      para: "Яхши шрифт ўзини кўрсатмайди — у матнни ўқишни енгиллаштиради. Ҳарфлар орасидаги масофа, сўзлар ритми ва сатрлар оралиғи биргаликда саҳифага овоз беради.",
    };
  }
  const a = support?.uzLatin ? "ʻ" : "‘";
  return {
    line: uzSample(support),
    para: `Yaxshi shrift o${a}zini ko${a}rsatmaydi — u matnni o${a}qishni yengillashtiradi. Harflar orasidagi masofa, so${a}zlar ritmi va satrlar oralig${a}i birgalikda sahifaga ovoz beradi. Shuning uchun shriftni tanlashda faqat sarlavhaga emas, uzun matnga ham qarang.`,
  };
}

const WATERFALL = [96, 64, 48, 32, 24, 18, 14];

export default async function FontDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const L = DICTS[locale].font;
  const f = await db.family.findUnique({
    where: { slug },
    include: { styles: { orderBy: [{ italic: "asc" }, { weight: "asc" }] } },
  });
  if (!f || !isPublicFamily(f)) notFound();

  const cuts = f.styles.map((s) => ({ style: s.style, subfamily: s.subfamily, weight: s.weight, italic: s.italic }));
  // Shared family (hero + waterfall, at the preview weight) + one unique family
  // per cut (tester / style rows / glyphs never collide on width variants).
  const pv = previewStyle(cuts);
  const pvFile = pv && f.styles.find((s) => s.style === pv.style);
  // The hero title is the page's largest paint — fetch its cut first.
  if (pv) preload(webfontUrl(slug, pv.style), { as: "font", type: "font/woff2", crossOrigin: "anonymous" });

  const [relatedRows, glyph, works] = await Promise.all([
    db.family.findMany({
      where: { ...PUBLIC_FAMILY, category: f.category, slug: { not: slug } },
      include: cardInclude, take: 3, orderBy: { popularity: "desc" },
    }),
    pvFile ? getGlyphInfo(slug, pvFile.style, f.folder, pvFile.file).catch(() => null) : Promise.resolve(null),
    worksUsingFont(slug),
  ]);
  const related = relatedRows.map(toCard);
  const support = glyph?.support ?? null;
  const groups = glyph ? groupGlyphs(glyph.chars) : [];
  const cyrillicOnly = !f.hasLatin && f.hasCyrillic;
  const t = texts(support, cyrillicOnly, locale, f.hasCyrillic);

  const faceCSS = fontFaceCSS(slug, cuts) + fontFaceCSSPerStyle(slug, cuts) + cardsFaceCSS(related);
  const family = `"${cssFamily(slug)}", var(--font)`;
  const pvFamily = pv ? `"${styleFamily(slug, pv.style)}", var(--font)` : family;
  const cat = categoryLabel(f.category, locale);
  const sections = ["sinash", "uslublar", ...(groups.length ? ["belgilar"] : []), "matn", "haqida"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <JsonLd data={fontJsonLd(f, fontDescription(f, locale), locale)} />

      <div className="container">
        <nav className="crumbs" aria-label={L.crumbs}>
          <Link href="/fonts">{L.fonts}</Link>
          <IconChevron />
          <Link href={`/fonts?cat=${f.category}`}>{cat}</Link>
          <IconChevron />
          <span aria-current="page">{f.name}</span>
        </nav>

        <section className="fhero">
          <div style={{ minWidth: 0 }}>
            <h1 className="fhero-title" style={{ fontFamily: family, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>{f.name}</h1>
            {f.tagline && locale === "uz" && <p className="fhero-tagline">{f.tagline}</p>}
            {support && (
              <ul className="fhero-badges" aria-label={L.scripts}>
                <li className={`tag ${support.uzLatin ? "tag-ok" : support.uzLatinBasic ? "tag-warn" : "tag-off"}`}>
                  {support.uzLatin ? L.uzLatinOk : support.uzLatinBasic ? L.uzLatinBasic : L.uzLatinNo}
                </li>
                <li className={`tag ${support.uzCyrillic ? "tag-ok" : support.cyrillic ? "tag-warn" : "tag-off"}`}>
                  {support.uzCyrillic ? L.uzCyrOk : support.cyrillic ? L.uzCyrRu : L.uzCyrNo}
                </li>
              </ul>
            )}
          </div>
          <DownloadBox slug={slug} name={f.name} styleCount={f.styleCount} licenseClass={f.licenseClass} />
        </section>

        <dl className="specsheet">
          <div><dt>{L.category}</dt><dd>{cat}</dd></div>
          <div><dt>{L.styles}</dt><dd>{f.styleCount}{f.hasItalic ? L.withItalic : ""}</dd></div>
          <div><dt>{L.glyphs}</dt><dd>{f.glyphs > 0 ? `${formatNumber(f.glyphs)}+` : "—"}</dd></div>
          <div><dt>{L.designer}</dt><dd title={f.designer ?? undefined}>{f.designer ?? "—"}</dd></div>
          <div><dt>{L.license}</dt><dd>{f.licenseClass}</dd></div>
        </dl>
      </div>

      <Subnav name={f.name} slug={slug} styleCount={f.styleCount} has={sections} />

      <WorkbenchProvider cuts={cuts} name={f.name}>
        <div className="container">
          <section id="sinash" className="fsec" aria-labelledby="h-sinash">
            <div className="fsec-head"><h2 id="h-sinash">{L.tryIt}</h2><span className="label">{L.tryHint}</span></div>
            <Tester slug={slug} name={f.name} cuts={cuts} support={support} />
          </section>

          <section id="uslublar" className="fsec cv" aria-labelledby="h-uslublar">
            <div className="fsec-head"><h2 id="h-uslublar">{L.styles}</h2><span className="label">{L.cuts(cuts.length)}</span></div>
            <StyleRows slug={slug} cuts={cuts} fallback={t.line} />
          </section>
        </div>
      </WorkbenchProvider>

      <div className="container">
        {groups.length > 0 && (
          <section id="belgilar" className="fsec cv" aria-labelledby="h-belgilar">
            <div className="fsec-head"><h2 id="h-belgilar">{L.glyphs}</h2><span className="label">{L.glyphsN(glyph!.chars.length)}</span></div>
            <GlyphMap groups={groups} fontFamily={pvFamily} weight={pv?.weight ?? 400} italic={pv?.italic ?? false} total={glyph!.chars.length} />
          </section>
        )}

        <section id="matn" className="fsec cv" aria-labelledby="h-matn">
          <div className="fsec-head"><h2 id="h-matn">{L.inText}</h2><span className="label">{pv ? `${pv.style} · ${pv.weight}` : ""}</span></div>
          <div className="waterfall" style={{ fontFamily: pvFamily, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>
            {WATERFALL.map((px) => (
              <div className="wf-row" key={px}>
                <span className="px" style={{ fontFamily: "var(--font)", fontStyle: "normal", fontWeight: 400 }}>{px}px</span>
                <span className="t" style={{ fontSize: px }}>{t.line}</span>
              </div>
            ))}
          </div>
          <div className="para-grid" style={{ fontFamily: pvFamily, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>
            <div><span className="label" style={{ fontFamily: "var(--font)", fontStyle: "normal" }}>{L.text} · 16 / 26px</span><p style={{ fontSize: 16, lineHeight: "26px" }}>{t.para}</p></div>
            <div><span className="label" style={{ fontFamily: "var(--font)", fontStyle: "normal" }}>{L.text} · 21 / 32px</span><p style={{ fontSize: 21, lineHeight: "32px" }}>{t.para}</p></div>
          </div>
        </section>

        <section id="haqida" className="fsec cv" aria-labelledby="h-haqida">
          <div className="fsec-head"><h2 id="h-haqida">{L.about(f.name)}</h2></div>
          <div className="about-grid">
            <div className="prose">
              <p>{(locale === "uz" && f.description) || autoAbout(f, locale)}</p>
              {f.history && locale === "uz" && (<><h3>{L.history}</h3><p>{f.history}</p></>)}
              {f.usage && locale === "uz" && (<><h3>{L.usage}</h3><p>{f.usage}</p></>)}
            </div>
            <dl className="facts">
              {f.designer && <div><dt>{L.designer}</dt><dd>{f.designerUrl ? <a className="link" href={f.designerUrl} target="_blank" rel="noreferrer noopener">{f.designer}</a> : f.designer}</dd></div>}
              {f.manufacturer && f.manufacturer !== f.designer && <div><dt>{L.manufacturer}</dt><dd>{f.manufacturer}</dd></div>}
              {f.version && <div><dt>{L.version}</dt><dd>{f.version.replace(/^Version\s*/i, "")}</dd></div>}
              <div><dt>{L.license}</dt><dd>{f.licenseUrl ? <a className="link" href={f.licenseUrl} target="_blank" rel="noreferrer noopener">{f.license || f.licenseClass}</a> : (f.license || f.licenseClass)}</dd></div>
              <div><dt>{L.use}</dt><dd>{licenseNote(f.licenseClass, locale)?.split(" — ")[1] ?? L.termsInZip}</dd></div>
              {f.copyright && <div><dt>{L.copyright}</dt><dd style={{ fontWeight: 400, fontSize: 13 }}>{f.copyright}</dd></div>}
            </dl>
          </div>
        </section>

        {works.length > 0 && (
          <section className="fsec cv" aria-labelledby="h-works">
            <div className="fsec-head"><h2 id="h-works">{L.inUse}</h2><span className="label">{L.inUseSub(f.name)}</span></div>
            <div className="pf-grid pf-grid-3">
              {works.slice(0, 3).map((w) => <WorkCard key={w.slug} w={w} />)}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="fsec cv" aria-labelledby="h-related" style={{ paddingTop: 80 }}>
            <div className="section-head">
              <h2 id="h-related">{L.similar}</h2>
              <Link href={`/fonts?cat=${f.category}`} className="arrow-link">{L.allOfCat(cat)} <IconArrow /></Link>
            </div>
            <div className="fgrid">
              {related.map((r) => <FontCard key={r.slug} f={r} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
