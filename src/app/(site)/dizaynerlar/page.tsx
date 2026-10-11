import Link from "@/components/LLink";
import type { Metadata } from "next";
import { getPublishedWorks } from "@/lib/works";
import WorkCard from "@/components/WorkCard";
import AdSlot from "@/components/AdSlot";
import { IconArrow } from "@/components/Icons";
import { alternates, getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTS[await getLocale()].works;
  return { title: t.metaTitle, description: t.metaDescription, alternates: await alternates("/dizaynerlar") };
}

const KINDS = ["", "own", "partner", "member"] as const;

export default async function DesignersPage({ searchParams }: { searchParams: Promise<{ kind?: string; tag?: string }> }) {
  const sp = await searchParams;
  const kind = sp.kind === "own" || sp.kind === "partner" || sp.kind === "member" ? sp.kind : "";
  const tag = (sp.tag ?? "").trim();
  const [all, locale] = await Promise.all([getPublishedWorks(), getLocale()]);
  const t = DICTS[locale].works;
  const base = await lhref("/dizaynerlar");

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
    const tg = p.tag ?? tag;
    if (k) u.set("kind", k);
    if (tg) u.set("tag", tg);
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="container">
      <header className="page-head">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      {all.length > 0 && (
        <div className="pf-filters">
          <div className="seg" role="group" aria-label={t.kindLabel}>
            {KINDS.map((k) => (
              <Link key={k} href={href({ kind: k })} className="seg-link" aria-current={kind === k ? "true" : undefined}>{t.kinds[k]}</Link>
            ))}
          </div>
          {tags.length > 1 && (
            <div className="pf-tags" role="group" aria-label={t.byTag}>
              {tags.map(([tg, n]) => (
                <Link key={tg} href={href({ tag: tag === tg ? "" : tg })} className={`chip${tag === tg ? " active" : ""}`} aria-current={tag === tg ? "true" : undefined}>
                  {tg} <span className="n">{n}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {list.length === 0 ? (
        <div className="empty">
          <p className="display">{filtered ? t.emptyFiltered : t.soon}</p>
          <p>{filtered ? t.emptyFilteredText : t.soonText}</p>
          {filtered && <Link href="/dizaynerlar" className="btn">{t.all}</Link>}
        </div>
      ) : (
        <>
          {lead && <div className="pf-lead"><WorkCard w={lead} size="lg" headingLevel={2} /></div>}
          <div className="pf-grid">
            {rest.map((w) => <WorkCard key={w.slug} w={w} headingLevel={2} />)}
          </div>
        </>
      )}

      <AdSlot placement="dizaynerlar" />

      <section className="pf-cta">
        <div>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
        </div>
        <div className="pf-cta-actions">
          <Link href="/dizaynerlar/yuborish" className="btn btn-primary btn-lg">{t.ctaSubmit} <IconArrow className="ico" /></Link>
          <Link href="/support" className="btn btn-lg">{t.ctaPartner}</Link>
        </div>
      </section>
    </div>
  );
}
