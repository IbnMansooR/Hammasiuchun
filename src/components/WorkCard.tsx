import Link from "next/link";
import type { WorkCard as Work } from "@/lib/works";
import { IconImage } from "./Icons";

/** Portfolio tile. Partner work is always labelled as such (it is promotion). */
export default function WorkCard({ w, size = "md", headingLevel = 3 }: { w: Work; size?: "md" | "lg"; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const meta = [w.kind === "partner" ? w.authorName : w.client, w.year].filter(Boolean).join(" · ");
  return (
    <article className={`wcard${size === "lg" ? " wcard-lg" : ""}`}>
      <div className="wcard-media">
        {w.coverImage ? <img src={w.coverImage} alt="" loading="lazy" decoding="async" /> : <IconImage />}
        {w.kind === "partner" && <span className="wcard-flag">Hamkor</span>}
      </div>
      <div className="wcard-body">
        <H className="wcard-title"><Link href={`/portfolio/${w.slug}`} className="wcard-link">{w.title}</Link></H>
        {size === "lg" && w.summary && <p className="wcard-summary">{w.summary}</p>}
        {meta && <p className="wcard-meta">{meta}</p>}
      </div>
    </article>
  );
}
