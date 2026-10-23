import Link from "@/components/LLink";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import DesignerCard from "@/components/DesignerCard";
import { alternates, getLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Mashhur dizaynerlar",
    description: "Grafik dizaynerlar, tipograflar va shrift dizaynerlari: hayoti, mashhur ishlari va ularning ijodiga havolalar.",
    alternates: await alternates("/dizaynerlar/profil"),
    ...((await getLocale()) === "ru" ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DesignerProfiles() {
  const [list, locale] = await Promise.all([
    db.designer.findMany({ where: { isPublished: true }, orderBy: [{ publishedAt: "desc" }, { id: "desc" }], select: { slug: true, name: true, image: true, roles: true, country: true, born: true, died: true } }),
    getLocale(),
  ]);
  return (
    <div className="container">
      <nav className="crumbs" aria-label="Yoʻl"><Link href="/dizaynerlar">Dizaynerlar</Link><span aria-hidden="true"> / </span><span>Mashhur dizaynerlar</span></nav>
      {locale === "ru" && <p className="muted">Профили написаны только на узбекском языке.</p>}
      <header className="page-head">
        <div className="eyebrow">Dizaynerlar</div>
        <h1>Mashhur dizaynerlar</h1>
        <p className="lead">Grafik dizaynerlar, tipograflar va shrift ustalari: ular kim, nimalar yaratgan va ijodini qayerdan koʻrish mumkin.</p>
      </header>
      {list.length === 0 ? (
        <div className="empty"><p className="display">Tez orada</p><p>Birinchi profillar yaqin kunlarda chiqadi.</p></div>
      ) : (
        <div className="dgrid">{list.map((d) => <DesignerCard key={d.slug} d={d} headingLevel={2} />)}</div>
      )}
      <p className="muted dcredit">Maʼlumotlar Wikidata (CC0) manbasidan, rasmlar Wikimedia Commons’dan: muallifi va litsenziyasi har bir profilda koʻrsatilgan.</p>
    </div>
  );
}
