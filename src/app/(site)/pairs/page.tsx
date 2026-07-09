import Link from "next/link";
import { getPairings } from "@/lib/pairs";
import { styleFamily, webfontUrl } from "@/lib/fonts";

export const metadata = {
  title: "Shrift juftliklari",
  description: "Sarlavha va matn uchun tayyor shrift kombinatsiyalari — namuna matnlari bilan.",
};
export const dynamic = "force-dynamic";

export default async function PairsPage() {
  const pairings = await getPairings();

  // @font-face for every cut used on the page (unique family per cut).
  const cuts = pairings.flatMap((p) => [p.heading, p.body]);
  const seen = new Set<string>();
  const faceCSS = cuts
    .filter((c) => { const k = `${c.slug}/${c.style}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((c) =>
      `@font-face{font-family:"${styleFamily(c.slug, c.style)}";` +
      `src:url("${webfontUrl(c.slug, c.style)}") format("woff2");` +
      `font-weight:${c.weight};font-style:${c.italic ? "italic" : "normal"};font-display:swap;}`)
    .join("");

  return (
    <div className="container section" style={{ paddingTop: 30 }}>
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <div className="eyebrow">Juftliklar</div>
      <h1 style={{ fontSize: "clamp(32px,5vw,64px)", marginBottom: 14 }}>Shrift juftliklari</h1>
      <p className="muted" style={{ fontSize: 18, maxWidth: 620, marginBottom: 30 }}>
        Sarlavha va matn uchun tayyor kombinatsiyalar. Har bir juftlik — bitta xarakterli
        kesim va bitta oʻqilishi oson kesim. Kartani bosib, shriftga oʻting.
      </p>

      {pairings.length === 0 ? (
        <p className="muted" style={{ padding: "40px 0" }}>Juftliklar hozircha mavjud emas.</p>
      ) : (
        <div className="pairs-grid">
          {pairings.map((p) => (
            <article className="pair-card" key={p.id}>
              <div className="pair-tag">{p.label}</div>
              <div
                className="pair-head"
                style={{ fontFamily: `"${styleFamily(p.heading.slug, p.heading.style)}", var(--font)`, fontWeight: p.heading.weight, fontStyle: p.heading.italic ? "italic" : "normal" }}
              >
                {p.sampleHeading}
              </div>
              <p
                className="pair-body"
                style={{ fontFamily: `"${styleFamily(p.body.slug, p.body.style)}", var(--font)`, fontWeight: p.body.weight, fontStyle: p.body.italic ? "italic" : "normal" }}
              >
                {p.sampleBody}
              </p>
              <div className="pair-meta">
                <Link href={`/fonts/${p.heading.slug}`}>
                  <strong>{p.heading.name}</strong> · {p.heading.style}
                </Link>
                <span className="pair-plus">+</span>
                <Link href={`/fonts/${p.body.slug}`}>
                  <strong>{p.body.name}</strong> · {p.body.style}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
