import Link from "./LLink";
import { IconImage } from "./Icons";

export type DesignerCardData = { slug: string; name: string; image: string | null; roles: string; country: string | null; born: number | null; died: number | null };

export const years = (d: Pick<DesignerCardData, "born" | "died">) => (d.born ? `${d.born}–${d.died ?? ""}`.replace(/–$/, "") : "");

/** A designer's tile: the portrait (or a plain placeholder), the name, the years and what they did. */
export default function DesignerCard({ d, headingLevel = 3 }: { d: DesignerCardData; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const meta = [years(d), d.country].filter(Boolean).join(" · ");
  return (
    <article className="dcard">
      <div className="dcard-media">{d.image ? <img src={d.image} alt="" loading="lazy" decoding="async" /> : <IconImage />}</div>
      <div className="dcard-body">
        <H className="dcard-title"><Link href={`/dizaynerlar/profil/${d.slug}`} className="wcard-link">{d.name}</Link></H>
        {d.roles && <p className="dcard-roles">{d.roles.split(", ").slice(0, 2).join(", ")}</p>}
        {meta && <p className="wcard-meta">{meta}</p>}
      </div>
    </article>
  );
}
