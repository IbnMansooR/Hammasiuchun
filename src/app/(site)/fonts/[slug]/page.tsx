import Link from "next/link";
import { preload } from "react-dom";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cssFamily, styleFamily, fontFaceCSS, fontFaceCSSPerStyle, previewStyle, uzSample, webfontUrl, CATEGORY_LABEL } from "@/lib/fonts";
import { PUBLIC_FAMILY, isPublicFamily, LICENSE_NOTE } from "@/lib/license";
import { getGlyphInfo, groupGlyphs, type GlyphSupport } from "@/lib/glyphSupport";
import { cardInclude, toCard, cardsFaceCSS } from "@/lib/cards";
import { formatNumber } from "@/lib/format";
import { WorkbenchProvider, Tester, StyleRows } from "@/components/font/Workbench";
import GlyphMap from "@/components/font/GlyphMap";
import Subnav from "@/components/font/Subnav";
import DownloadBox from "@/components/DownloadBox";
import FontCard from "@/components/FontCard";
import { IconArrow, IconChevron } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.family.findUnique({ where: { slug }, select: { name: true, tagline: true, category: true, styleCount: true, isPublished: true, licenseClass: true } });
  // Don't leak unpublished/restricted family names via 404 metadata.
  return f && isPublicFamily(f)
    ? {
        title: f.name,
        description: f.tagline ?? `${f.name} — ${CATEGORY_LABEL[f.category] ?? f.category} shrift oilasi, ${f.styleCount} uslub. Bepul yuklab oling va oʻzbekcha matnda sinab koʻring.`,
        alternates: { canonical: `/fonts/${slug}` },
      }
    : {};
}

function autoAbout(f: {
  name: string; category: string; styleCount: number; hasItalic: boolean; glyphs: number;
  designer: string | null; manufacturer: string | null;
}): string {
  const cat = CATEGORY_LABEL[f.category] ?? f.category;
  const parts: string[] = [];
  parts.push(`${f.name} — ${cat.toLowerCase()} toifasidagi ${f.styleCount} uslubli shrift oilasi.`);
  if (f.designer) parts.push(`Uni ${f.designer} ishlab chiqqan.`);
  if (f.manufacturer && f.manufacturer !== f.designer) parts.push(`${f.manufacturer} tomonidan tayyorlangan.`);
  const bits: string[] = [];
  if (f.glyphs) bits.push(`${f.glyphs}+ belgi`);
  if (f.hasItalic) bits.push("kursiv variantlari");
  if (bits.length) parts.push(`Oila ${bits.join(" va ")}ni oʻz ichiga oladi.`);
  parts.push(`${cat} shriftlari sarlavhalar, brending va ${f.category === "Display" ? "ekspressiv dizayn" : "matnli tarkib"} uchun mos keladi.`);
  return parts.join(" ");
}

function texts(support: GlyphSupport | null, cyrillicOnly: boolean) {
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

  const [relatedRows, glyph] = await Promise.all([
    db.family.findMany({
      where: { ...PUBLIC_FAMILY, category: f.category, slug: { not: slug } },
      include: cardInclude, take: 3, orderBy: { popularity: "desc" },
    }),
    pvFile ? getGlyphInfo(slug, pvFile.style, f.folder, pvFile.file).catch(() => null) : Promise.resolve(null),
  ]);
  const related = relatedRows.map(toCard);
  const support = glyph?.support ?? null;
  const groups = glyph ? groupGlyphs(glyph.chars) : [];
  const cyrillicOnly = !f.hasLatin && f.hasCyrillic;
  const t = texts(support, cyrillicOnly);

  const faceCSS = fontFaceCSS(slug, cuts) + fontFaceCSSPerStyle(slug, cuts) + cardsFaceCSS(related);
  const family = `"${cssFamily(slug)}", var(--font)`;
  const pvFamily = pv ? `"${styleFamily(slug, pv.style)}", var(--font)` : family;
  const cat = CATEGORY_LABEL[f.category] ?? f.category;
  const sections = ["sinash", "uslublar", ...(groups.length ? ["belgilar"] : []), "matn", "haqida"];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />

      <div className="container">
        <nav className="crumbs" aria-label="Yoʻl">
          <Link href="/fonts">Shriftlar</Link>
          <IconChevron />
          <Link href={`/fonts?cat=${f.category}`}>{cat}</Link>
          <IconChevron />
          <span aria-current="page">{f.name}</span>
        </nav>

        <section className="fhero">
          <div style={{ minWidth: 0 }}>
            <h1 className="fhero-title" style={{ fontFamily: family, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>{f.name}</h1>
            {f.tagline && <p className="fhero-tagline">{f.tagline}</p>}
            {support && (
              <ul className="fhero-badges" aria-label="Yozuv qoʻllab-quvvatlanishi">
                <li className={`tag ${support.uzLatin ? "tag-ok" : support.uzLatinBasic ? "tag-warn" : "tag-off"}`}>
                  {support.uzLatin ? "✓ Oʻzbek lotin — oʻ, gʻ (ʻ)" : support.uzLatinBasic ? "≈ Oʻzbek lotin — ʻ yoʻq, ‘ bilan yoziladi" : "✕ Oʻzbek lotin belgilari yoʻq"}
                </li>
                <li className={`tag ${support.uzCyrillic ? "tag-ok" : support.cyrillic ? "tag-warn" : "tag-off"}`}>
                  {support.uzCyrillic ? "✓ Oʻzbek kirill — ў қ ғ ҳ" : support.cyrillic ? "≈ Rus kirill bor, ў қ ғ ҳ yoʻq" : "✕ Kirill yoʻq"}
                </li>
              </ul>
            )}
          </div>
          <DownloadBox slug={slug} name={f.name} styleCount={f.styleCount} licenseClass={f.licenseClass} />
        </section>

        <dl className="specsheet">
          <div><dt>Kategoriya</dt><dd>{cat}</dd></div>
          <div><dt>Uslublar</dt><dd>{f.styleCount}{f.hasItalic ? " · kursiv bilan" : ""}</dd></div>
          <div><dt>Belgilar</dt><dd>{f.glyphs > 0 ? `${formatNumber(f.glyphs)}+` : "—"}</dd></div>
          <div><dt>Dizayner</dt><dd title={f.designer ?? undefined}>{f.designer ?? "—"}</dd></div>
          <div><dt>Litsenziya</dt><dd>{f.licenseClass}</dd></div>
        </dl>
      </div>

      <Subnav name={f.name} slug={slug} styleCount={f.styleCount} has={sections} />

      <WorkbenchProvider cuts={cuts} name={f.name}>
        <div className="container">
          <section id="sinash" className="fsec" aria-labelledby="h-sinash">
            <div className="fsec-head"><h2 id="h-sinash">Sinab koʻring</h2><span className="label">Matnni oʻzgartirish uchun ustiga bosing</span></div>
            <Tester slug={slug} name={f.name} cuts={cuts} support={support} />
          </section>

          <section id="uslublar" className="fsec cv" aria-labelledby="h-uslublar">
            <div className="fsec-head"><h2 id="h-uslublar">Uslublar</h2><span className="label">{cuts.length} ta kesim</span></div>
            <StyleRows slug={slug} cuts={cuts} fallback={t.line} />
          </section>
        </div>
      </WorkbenchProvider>

      <div className="container">
        {groups.length > 0 && (
          <section id="belgilar" className="fsec cv" aria-labelledby="h-belgilar">
            <div className="fsec-head"><h2 id="h-belgilar">Belgilar</h2><span className="label">{glyph!.chars.length} ta belgi</span></div>
            <GlyphMap groups={groups} fontFamily={pvFamily} weight={pv?.weight ?? 400} italic={pv?.italic ?? false} total={glyph!.chars.length} />
          </section>
        )}

        <section id="matn" className="fsec cv" aria-labelledby="h-matn">
          <div className="fsec-head"><h2 id="h-matn">Matnda</h2><span className="label">{pv ? `${pv.style} · ${pv.weight}` : ""}</span></div>
          <div className="waterfall" style={{ fontFamily: pvFamily, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>
            {WATERFALL.map((px) => (
              <div className="wf-row" key={px}>
                <span className="px" style={{ fontFamily: "var(--font)", fontStyle: "normal", fontWeight: 400 }}>{px}px</span>
                <span className="t" style={{ fontSize: px }}>{t.line}</span>
              </div>
            ))}
          </div>
          <div className="para-grid" style={{ fontFamily: pvFamily, fontWeight: pv?.weight ?? 400, fontStyle: pv?.italic ? "italic" : "normal" }}>
            <div><span className="label" style={{ fontFamily: "var(--font)", fontStyle: "normal" }}>Matn · 16 / 26px</span><p style={{ fontSize: 16, lineHeight: "26px" }}>{t.para}</p></div>
            <div><span className="label" style={{ fontFamily: "var(--font)", fontStyle: "normal" }}>Matn · 21 / 32px</span><p style={{ fontSize: 21, lineHeight: "32px" }}>{t.para}</p></div>
          </div>
        </section>

        <section id="haqida" className="fsec cv" aria-labelledby="h-haqida">
          <div className="fsec-head"><h2 id="h-haqida">{f.name} haqida</h2></div>
          <div className="about-grid">
            <div className="prose">
              <p>{f.description || autoAbout(f)}</p>
              {f.history && (<><h3>Tarixi</h3><p>{f.history}</p></>)}
              {f.usage && (<><h3>Qoʻllanilishi</h3><p>{f.usage}</p></>)}
            </div>
            <dl className="facts">
              {f.designer && <div><dt>Dizayner</dt><dd>{f.designerUrl ? <a className="link" href={f.designerUrl} target="_blank" rel="noreferrer noopener">{f.designer}</a> : f.designer}</dd></div>}
              {f.manufacturer && f.manufacturer !== f.designer && <div><dt>Ishlab chiqaruvchi</dt><dd>{f.manufacturer}</dd></div>}
              {f.version && <div><dt>Versiya</dt><dd>{f.version.replace(/^Version\s*/i, "")}</dd></div>}
              <div><dt>Litsenziya</dt><dd>{f.licenseUrl ? <a className="link" href={f.licenseUrl} target="_blank" rel="noreferrer noopener">{f.license || f.licenseClass}</a> : (f.license || f.licenseClass)}</dd></div>
              <div><dt>Foydalanish</dt><dd>{LICENSE_NOTE[f.licenseClass]?.split(" — ")[1] ?? "Shartlar ZIP ichida"}</dd></div>
              {f.copyright && <div><dt>Huquq egasi</dt><dd style={{ fontWeight: 400, fontSize: 13 }}>{f.copyright}</dd></div>}
            </dl>
          </div>
        </section>

        {related.length > 0 && (
          <section className="fsec cv" aria-labelledby="h-related" style={{ paddingTop: 80 }}>
            <div className="section-head">
              <h2 id="h-related">Oʻxshash shriftlar</h2>
              <Link href={`/fonts?cat=${f.category}`} className="arrow-link">Barcha {cat.toLowerCase()} <IconArrow /></Link>
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
