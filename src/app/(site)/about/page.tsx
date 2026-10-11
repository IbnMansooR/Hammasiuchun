import Link from "@/components/LLink";
import type { Metadata } from "next";
import { formatNumber } from "@/lib/format";
import { getPublicCounts, DOWNLOADS_SHOWN_FROM } from "@/lib/stats";
import Facts from "@/components/Facts";
import { IconArrow } from "@/components/Icons";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTS[await getLocale()].about;
  return { title: t.metaTitle, description: t.metaDescription, alternates: await alternates("/about") };
}

export default async function AboutPage() {
  const [{ families, styles, downloads }, locale] = await Promise.all([getPublicCounts(), getLocale()]);
  const t = DICTS[locale].about;
  const h = DICTS[locale].home;
  return (
    <div className="container">
      <header className="page-head narrow">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      <Facts style={{ marginTop: 8 }} items={[
        [formatNumber(families), h.factFamilies(families)],
        [formatNumber(styles), h.factStyles(styles)],
        ...(downloads >= DOWNLOADS_SHOWN_FROM ? [[formatNumber(downloads), h.factDownloads(downloads)] as [string, string]] : []),
        [t.city, t.country],
      ]} />

      <section className="section" aria-labelledby="p-h">
        <div className="section-head"><h2 id="p-h">{t.principles}</h2></div>
        <ol className="principles">
          {t.items.map((p, i) => (
            <li key={p.t}>
              <span className="idx" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 32 }}>
          <Link href="/fonts" className="btn btn-accent btn-lg">{t.seeFonts} <IconArrow className="ico" /></Link>
          <Link href="/license" className="btn btn-lg">{t.license}</Link>
        </div>
      </section>
    </div>
  );
}
