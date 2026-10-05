import Link from "next/link";
import { getPairings } from "@/lib/pairs";
import { styleFamily, webfontUrl } from "@/lib/fonts";

export const metadata = {
  title: "Shrift juftliklari",
  description: "Sarlavha va matn uchun tayyor shrift kombinatsiyalari — namuna matnlari bilan.",
  alternates: { canonical: "/pairs" },
};
export const dynamic = "force-dynamic";

const cutStyle = (c: { slug: string; style: string; weight: number; italic: boolean }) => ({
  fontFamily: `"${styleFamily(c.slug, c.style)}", var(--font)`,
  fontWeight: c.weight,
  fontStyle: c.italic ? ("italic" as const) : ("normal" as const),
});

export default async function PairsPage() {
  const pairings = await getPairings();

  // @font-face for every cut used on the page (unique family per cut).
  const seen = new Set<string>();
  const faceCSS = pairings
    .flatMap((p) => [p.heading, p.body])
    .filter((c) => { const k = `${c.slug}/${c.style}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((c) =>
      `@font-face{font-family:"${styleFamily(c.slug, c.style)}";` +
      `src:url("${webfontUrl(c.slug, c.style)}") format("woff2");` +
      `font-weight:${c.weight};font-style:${c.italic ? "italic" : "normal"};font-display:swap;}`)
    .join("");

  return (
    <div className="container">
      <style dangerouslySetInnerHTML={{ __html: faceCSS }} />
      <header className="page-head narrow">
        <div className="eyebrow">Juftliklar</div>
        <h1>Bir-birini toʻldiradigan shriftlar</h1>
        <p className="lead">
          Sarlavha uchun xarakterli kesim, matn uchun oʻqilishi oson kesim. Har bir juftlik tayyor —
          shrift nomini bosib, uni sinab koʻring.
        </p>
      </header>

      {pairings.length === 0 ? (
        <div className="empty">
          <div className="display">Hozircha juftlik yoʻq</div>
          <p>Katalog toʻlgani sari bu yerda tayyor kombinatsiyalar paydo boʻladi.</p>
          <Link href="/fonts" className="btn btn-primary">Shriftlarni koʻrish</Link>
        </div>
      ) : (
        <div className="pairs-grid">
          {pairings.map((p) => (
            <article className="pair-card" key={p.id}>
              <div className="pair-tag">{p.label}</div>
              <h2 className="pair-head" style={cutStyle(p.heading)}>{p.sampleHeading}</h2>
              <p className="pair-body" style={cutStyle(p.body)}>{p.sampleBody}</p>
              <div className="pair-meta">
                <Link href={`/fonts/${p.heading.slug}`}><strong>{p.heading.name}</strong> {p.heading.style}</Link>
                <span className="pair-plus" aria-hidden="true">+</span>
                <Link href={`/fonts/${p.body.slug}`}><strong>{p.body.name}</strong> {p.body.style}</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
