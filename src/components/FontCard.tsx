import Link from "next/link";
import { CATEGORY_LABEL, cardSample } from "@/lib/fonts";
import { cardFontStyle, type CardFont } from "@/lib/cards";
import { PreviewText } from "./PreviewProvider";
import WishButton from "./WishButton";

/** One family in a grid/list. The whole card is clickable through a stretched
 * link on the name; the heart sits above it as its own button. */
export default function FontCard({ f, headingLevel = 3 }: { f: CardFont; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const cyrillicOnly = !f.hasLatin && f.hasCyrillic;
  return (
    <article className="fcard">
      <div className="fcard-head">
        <H className="fcard-name">
          <Link href={`/fonts/${f.slug}`} className="fcard-link">{f.name}</Link>
        </H>
        <WishButton slug={f.slug} name={f.name} />
      </div>
      <PreviewText className="fcard-sample" style={cardFontStyle(f)} fallback={cardSample(f.category, cyrillicOnly)} />
      <div className="fcard-foot">
        <span>{CATEGORY_LABEL[f.category] ?? f.category}</span>
        <span className="sep" aria-hidden="true" />
        <span>{f.styleCount} uslub</span>
        {f.hasCyrillic && <span className="tag" title="Kirill yozuvi bor">Кир</span>}
        {f.isNew && <span className="tag tag-new">Yangi</span>}
      </div>
    </article>
  );
}
