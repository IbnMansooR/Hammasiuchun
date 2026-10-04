import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { cssFamily, styleFamily, fontFaceCSS, fontFaceCSSPerStyle, previewStyle, uzSample, CATEGORY_LABEL } from "@/lib/fonts";
import { PUBLIC_FAMILY, isPublicFamily } from "@/lib/license";
import { getGlyphSupport } from "@/lib/glyphSupport";
import Tester from "@/components/Tester";
import DownloadBox from "@/components/DownloadBox";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.family.findUnique({ where: { slug }, select: { name: true, tagline: true, isPublished: true, licenseClass: true } });
  // Don't leak unpublished/restricted family names via 404 metadata.
  return f && isPublicFamily(f)
    ? { title: f.name, description: f.tagline ?? `${f.name} — Feekr shrift oilasi`, alternates: { canonical: `/fonts/${slug}` } }
    : {};
}

function autoAbout(f: {
  name: string; category: string; styleCount: number; hasItalic: boolean; glyphs: number;
  designer: string | null; manufacturer: string | null; licenseClass: string;
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
  parts.push(
    `${cat} shriftlari sarlavhalar, brending va ${f.category === "Display" ? "ekspressiv dizayn" : "matnli tarkib"} uchun mos keladi.`,
  );
  return parts.join(" ");
}

export default async function FontDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await db.family.findUnique({
    where: { slug },
    include: { styles: { orderBy: [{ italic: "asc" }, { weight: "asc" }] } },
  });
  if (!f || !isPublicFamily(f)) notFound();

  const styles = f.styles.map((s) => ({
    style: s.style, subfamily: s.subfamily, weight: s.weight, italic: s.italic,
  }));
  // Shared family (for the hero, which uses the preview weight) + one unique
  // family per cut (so the style rows / tester never collide on width variants).
  const faceCSS = fontFaceCSS(slug, styles) + fontFaceCSSPerStyle(slug, styles);
  const pv = previewStyle(styles);
  const family = `"${cssFamily(slug)}", var(--font)`;
  const pvFile = pv && f.styles.find((s) => s.style === pv.style);

  const [related, support] = await Promise.all([
    db.family.findMany({
      where: { ...PUBLIC_FAMILY, category: f.category, slug: { not: slug } },
      include: { styles: { select: { style: true, weight: true, italic: true } } },
      take: 3, orderBy: { popularity: "desc" },
    }),
    pvFile ? getGlyphSupport(slug, pvFile.style, f.folder, pvFile.file).catch(() => null) : Promise.resolve(null),
  ]);
  const sample = uzSample(support);

  return (
    <div className="container">
      <style dangerouslySetInnerHTML={{ __html: faceCSS + relatedFaceCSS(related) }} />

      {/* Hero */}
      <section className="detail-hero">
        <Link href="/fonts" className="fcard-tags">← Barcha shriftlar</Link>
        <h1 className="detail-title" style={{ fontFamily: family, fontWeight: pv?.weight ?? 700, marginTop: 14 }}>{f.name}</h1>
        <div className="detail-meta">
          <span>{CATEGORY_LABEL[f.category] ?? f.category}</span>
          <span>{f.styleCount} uslub</span>
          {f.hasItalic && <span>Kursiv</span>}
          {f.glyphs > 0 && <span>{f.glyphs}+ belgi</span>}
          {f.designer && <span>Dizayn: {f.designer}</span>}
          <span>Litsenziya: {f.licenseClass}</span>
        </div>
        {support && (
          <ul className="glyph-badges" aria-label="Yozuv qoʻllab-quvvatlanishi">
            <li className={support.uzLatin ? "ok" : support.uzLatinBasic ? "part" : "no"}>
              {support.uzLatin ? "✓ Oʻzbek lotin (oʻ, gʻ)" : support.uzLatinBasic ? "≈ Oʻzbek lotin — ʻ belgisi yoʻq, ‘ bilan yoziladi" : "✕ Oʻzbek lotin belgilari yoʻq"}
            </li>
            <li className={support.uzCyrillic ? "ok" : support.cyrillic ? "part" : "no"}>
              {support.uzCyrillic ? "✓ Oʻzbek kirill (ў қ ғ ҳ)" : support.cyrillic ? "≈ Rus kirill bor, ў қ ғ ҳ yoʻq" : "✕ Kirill yoʻq"}
            </li>
          </ul>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        <Tester slug={slug} name={f.name} styles={styles} support={support} />
      </div>

      <div className="detail-grid">
        <div>
          {/* All cuts */}
          <h2 style={{ fontSize: 24, margin: "10px 0" }}>Uslublar ({f.styleCount})</h2>
          <div>
            {styles.map((s, i) => (
              <div className="style-row" key={i}>
                <div className="txt" style={{ fontFamily: `"${styleFamily(slug, s.style)}", var(--font)`, fontWeight: s.weight, fontStyle: s.italic ? "italic" : "normal" }}>
                  {sample}
                </div>
                <div className="lbl">{s.subfamily || s.style}</div>
              </div>
            ))}
          </div>

          {/* Editorial / CTA */}
          <section style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 28, marginBottom: 14 }}>{f.name} haqida</h2>
            <div className="prose">
              {f.description ? (
                <p>{f.description}</p>
              ) : (
                <p>{autoAbout(f)}</p>
              )}
              {f.history && (<><h3>Tarixi</h3><p>{f.history}</p></>)}
              {f.usage && (<><h3>Qoʻllanilishi</h3><p>{f.usage}</p></>)}
              {f.copyright && (
                <p className="muted" style={{ fontSize: 13.5, marginTop: 20 }}>{f.copyright}</p>
              )}
            </div>
          </section>
        </div>

        <DownloadBox slug={slug} name={f.name} styleCount={f.styleCount} licenseClass={f.licenseClass} />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Oʻxshash oilalar</h2></div>
          <div className="grid cols-3">
            {related.map((r) => {
              const rp = previewStyle(r.styles.map((s) => ({ style: s.style, weight: s.weight, italic: s.italic })));
              return (
                <Link key={r.slug} href={`/fonts/${r.slug}`} className="fcard">
                  <div className="fcard-name">{r.name}</div>
                  <div className="fcard-sample" style={{ fontFamily: `"${cssFamily(r.slug)}", var(--font)`, fontWeight: rp?.weight ?? 400 }}>
                    AaBbCc
                  </div>
                  <div className="fcard-tags">{r.styleCount} uslub</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function relatedFaceCSS(
  related: { slug: string; styles: { style: string; weight: number; italic: boolean }[] }[],
): string {
  return related
    .map((r) => {
      const pv = previewStyle(r.styles);
      return pv ? fontFaceCSS(r.slug, [pv]) : "";
    })
    .join("");
}
