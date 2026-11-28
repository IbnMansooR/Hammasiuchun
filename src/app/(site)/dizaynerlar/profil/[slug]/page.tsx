import Link from "@/components/LLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { years } from "@/components/DesignerCard";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { alternates, getLocale } from "@/i18n/server";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await db.designer.findUnique({ where: { slug } });
  if (!d || !d.isPublished) return {};
  return {
    title: `${d.name} — dizayner`,
    description: d.summary.slice(0, 200),
    alternates: await alternates(`/dizaynerlar/profil/${slug}`),
    openGraph: d.image ? { images: [d.image.startsWith("/") ? `${SITE_URL}${d.image}` : d.image] } : undefined,
    ...((await getLocale()) === "ru" ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DesignerPage({ params }: Params) {
  const { slug } = await params;
  const d = await db.designer.findUnique({ where: { slug } });
  if (!d || !d.isPublished) notFound();
  const locale = await getLocale();
  const known = (() => { try { return (JSON.parse(d.knownFor) as { label: string }[]).map((k) => k.label); } catch { return []; } })();
  const meta = [years(d), d.country].filter(Boolean).join(" · ");
  const related = await db.designer.findMany({ where: { isPublished: true, slug: { not: d.slug } }, orderBy: { publishedAt: "desc" }, take: 3, select: { slug: true, name: true } });
  return (
    <article className="container dprofile">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Person", name: d.name, description: d.summary,
        ...(d.image ? { image: d.image.startsWith("/") ? `${SITE_URL}${d.image}` : d.image } : {}),
        ...(d.born ? { birthDate: String(d.born) } : {}), ...(d.died ? { deathDate: String(d.died) } : {}),
        jobTitle: d.roles, url: `${SITE_URL}/dizaynerlar/profil/${d.slug}`,
        sameAs: [d.wikiUrl, d.website, `https://www.wikidata.org/wiki/${d.wikidataId}`].filter(Boolean),
      }} />
      <nav className="crumbs" aria-label="Yoʻl"><Link href="/dizaynerlar">Dizaynerlar</Link><span aria-hidden="true"> / </span><Link href="/dizaynerlar/profil">Mashhur dizaynerlar</Link></nav>
      {locale === "ru" && <p className="muted">Профили написаны только на узбекском языке.</p>}
      <div className="dprofile-grid" lang="uz">
        <div className="dprofile-main">
          <div className="eyebrow">Dizayner</div>
          <h1 className="display">{d.name}</h1>
          {meta && <p className="lead">{meta}</p>}
          <p className="dprofile-summary">{d.summary}</p>
          {known.length > 0 && (
            <section aria-labelledby="dp-known">
              <h2 id="dp-known">Mashhur ishlari</h2>
              <ul className="dprofile-list">{known.map((k) => <li key={k}>{k}</li>)}</ul>
            </section>
          )}
          <p className="dprofile-links">
            {d.wikiUrl && <a className="btn btn-sm" href={d.wikiUrl} target="_blank" rel="noopener nofollow">Wikipedia ↗</a>}
            {d.website && <a className="btn btn-sm" href={d.website} target="_blank" rel="noopener nofollow">Rasmiy sayt ↗</a>}
          </p>
        </div>
        {d.image && (
          <figure className="dprofile-fig">
            <img src={d.image} alt={`${d.name} portreti`} width={600} height={750} />
            {d.imageCredit && (
              <figcaption>
                Rasm: {d.imageCredit}
                {d.imageSource && /^https:\/\//.test(d.imageSource) && <> · <a href={d.imageSource} target="_blank" rel="noopener nofollow">Wikimedia Commons</a></>}
              </figcaption>
            )}
          </figure>
        )}
      </div>
      <p className="muted dcredit">Maʼlumotlar: <a href={`https://www.wikidata.org/wiki/${d.wikidataId}`} target="_blank" rel="noopener nofollow">Wikidata</a> (CC0). Matn Feekr tomonidan faktlardan tuzilgan.</p>
      {related.length > 0 && (
        <section aria-labelledby="dp-more">
          <h2 id="dp-more">Yana dizaynerlar</h2>
          <ul className="dprofile-list">{related.map((r) => <li key={r.slug}><Link href={`/dizaynerlar/profil/${r.slug}`}>{r.name}</Link></li>)}</ul>
        </section>
      )}
    </article>
  );
}
