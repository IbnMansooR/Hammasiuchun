import Link from "next/link";
import { cssFamily, UZ_SAMPLE, CATEGORY_LABEL } from "@/lib/fonts";
import type { CardFont } from "@/lib/queries";

// Cyrillic sample for families that carry Cyrillic but no Latin coverage, so the
// card previews the actual typeface instead of the fallback UI font.
const CYR_ALPHA = "АаБбВвГгДдЕе";
const CYR_PANGRAM = "Съешь ещё этих мягких французских булок";

export default function FontCard({ f }: { f: CardFont }) {
  const style = {
    fontFamily: `"${cssFamily(f.slug)}", var(--font)`,
    fontWeight: f.previewWeight,
    fontStyle: f.previewItalic ? ("italic" as const) : ("normal" as const),
  };
  const cyrillicOnly = !f.hasLatin && f.hasCyrillic;
  const alpha = cyrillicOnly ? CYR_ALPHA : "AaBbCcDdEe";
  const pangram = cyrillicOnly ? CYR_PANGRAM : UZ_SAMPLE;
  return (
    <Link href={`/fonts/${f.slug}`} className="fcard">
      <div className="fcard-top">
        <div className="fcard-name">{f.name}</div>
        <div className="fcard-tags">
          {f.styleCount} uslub{f.hasItalic ? " · Kursiv" : ""}
        </div>
      </div>
      <div className="fcard-sample" style={style}>{alpha}</div>
      <div className="fcard-pangram" style={style}>{pangram}</div>
      <div className="fcard-foot">
        <div className="fcard-badges">
          {f.isNew && <span className="badge badge-new">Yangi</span>}
          <span className="badge">{CATEGORY_LABEL[f.category] ?? f.category}</span>
        </div>
        <span className="fcard-cta">Koʻrish →</span>
      </div>
    </Link>
  );
}
