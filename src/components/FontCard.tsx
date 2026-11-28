"use client";
import Link from "./LLink";
import { categoryLabel, cardSample } from "@/lib/fonts";
import { useLocale, useT } from "@/i18n/client";
import { cardFontStyle, type CardFont } from "@/lib/cards";
import { PreviewText } from "./PreviewProvider";
import WishButton from "./WishButton";

/** One family in a grid/list. The whole card is clickable through a stretched
 * link on the name; the heart sits above it as its own button. */
export default function FontCard({ f, headingLevel = 3 }: { f: CardFont; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const cyrillicOnly = !f.hasLatin && f.hasCyrillic;
  const locale = useLocale();
  const t = useT().card;
  return (
    <article className="fcard">
      <div className="fcard-head">
        <H className="fcard-name">
          <Link href={`/fonts/${f.slug}`} className="fcard-link">{f.name}</Link>
        </H>
        <WishButton slug={f.slug} name={f.name} />
      </div>
      <PreviewText className="fcard-sample" style={cardFontStyle(f)} fallback={cardSample(f.category, cyrillicOnly, locale, f.hasCyrillic)} />
      <div className="fcard-foot">
        <span>{categoryLabel(f.category, locale)}</span>
        <span className="sep" aria-hidden="true" />
        <span>{t.styles(f.styleCount)}</span>
        {f.hasCyrillic && <span className="tag" title={t.hasCyr}>Кир</span>}
        {f.isNew && <span className="tag tag-new">{t.isNew}</span>}
      </div>
    </article>
  );
}
