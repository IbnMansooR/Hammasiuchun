import type { Metadata } from "next";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";
import FontFinder from "@/components/FontFinder";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTS[await getLocale()].finder;
  return { title: t.metaTitle, description: t.metaDesc, alternates: await alternates("/shrift-topish") };
}

export default async function FinderPage() {
  const t = DICTS[await getLocale()].finder;
  return (
    <div className="container finder-page">
      <header className="page-head narrow">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>
      <FontFinder />
      <section className="finder-tips narrow" aria-labelledby="finder-tips">
        <h2 id="finder-tips">{t.tips}</h2>
        <ul>
          <li>{t.tip1}</li>
          <li>{t.tip2}</li>
          <li>{t.tip3}</li>
        </ul>
      </section>
    </div>
  );
}
