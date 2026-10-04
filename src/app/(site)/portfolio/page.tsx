import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedWorks } from "@/lib/works";
import WorkCard from "@/components/WorkCard";
import { IconArrow } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Feekr dizayn ishlari va hamkor dizaynerlar portfoliosi: brending, logotip, qadoq va tipografiya loyihalari.",
  alternates: { canonical: "/portfolio" },
};

const KINDS = [
  { key: "", label: "Hammasi" },
  { key: "own", label: "Feekr ishlari" },
  { key: "partner", label: "Hamkorlar" },
] as const;

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ kind?: string; tag?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "own" || sp.kind === "partner" ? sp.kind : "";
  const tag = (sp.tag ?? "").trim();
  const all = await getPublishedWorks();

  const tagCounts = new Map<string, number>();
  for (const w of all) for (const t of w.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const list = all.filter((w) => (!kind || w.kind === kind) && (!tag || w.tags.includes(tag)));
  const filtered = !!(kind || tag);
  // The first featured work leads as a wide tile when the list isn't filtered.
  const lead = !filtered ? list.find((w) => w.isFeatured) : undefined;
  const rest = lead ? list.filter((w) => w !== lead) : list;
  const href = (p: { kind?: string; tag?: string }) => {
    const u = new URLSearchParams();
    const k = p.kind ?? kind;
    const t = p.tag ?? tag;
    if (k) u.set("kind", k);
    if (t) u.set("tag", t);
    const s = u.toString();
    return s ? `/portfolio?${s}` : "/portfolio";
  };

  return (
    <div className="container">
      <header className="page-head">
        <div className="eyebrow">Portfolio</div>
        <h1>Ishlar</h1>
        <p className="lead">Brending, logotip, qadoq va tipografiya loyihalari — oʻzimizniki va biz tavsiya qiladigan dizaynerlarniki.</p>
      </header>

      {all.length > 0 && (
        <div className="pf-filters">
          <div className="seg" role="group" aria-label="Ish turi">
            {KINDS.map((k) => (
              <Link key={k.key} href={href({ kind: k.key })} className="seg-link" aria-current={kind === k.key ? "true" : undefined}>{k.label}</Link>
            ))}
          </div>
          {tags.length > 1 && (
            <div className="pf-tags" role="group" aria-label="Teg boʻyicha">
              {tags.map(([t, n]) => (
                <Link key={t} href={href({ tag: tag === t ? "" : t })} className={`chip${tag === t ? " active" : ""}`} aria-current={tag === t ? "true" : undefined}>
                  {t} <span className="n">{n}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <p className="display">{filtered ? "Bu boʻlimda hali ish yoʻq" : "Tez orada"}</p>
          <p>{filtered ? "Boshqa filtrni tanlab koʻring." : "Birinchi loyihalar shu yerda paydo boʻladi."}</p>
          {filtered && <Link href="/portfolio" className="btn">Barcha ishlar</Link>}
        </div>
      ) : (
        <>
          {lead && <div className="pf-lead"><WorkCard w={lead} size="lg" headingLevel={2} /></div>}
          <div className="pf-grid">
            {rest.map((w) => <WorkCard key={w.slug} w={w} headingLevel={2} />)}
          </div>
        </>
      )}

      <section className="pf-cta">
        <div>
          <h2>Ishingiz shu yerda boʻlsinmi?</h2>
          <p>Dizayner yoki studiya boʻlsangiz, portfoliongizni Feekr auditoriyasiga koʻrsatamiz. Hamkor ishlari doim “Hamkor” deb belgilanadi.</p>
        </div>
        <Link href="/support" className="btn btn-primary btn-lg">Bogʻlanish <IconArrow className="ico" /></Link>
      </section>
    </div>
  );
}
