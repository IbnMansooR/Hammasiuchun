import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_FAMILY } from "@/lib/license";

// Rendered per request so the build never needs the DB; ~2.4k families is well
// under the 50k-URL sitemap limit.
export const dynamic = "force-dynamic";

const STATIC = ["", "/fonts", "/pairs", "/dizaynerlar", "/blog", "/about", "/license", "/support", "/reklama"];
// Pages that have a real Russian version (articles and works are written once, in Uzbek).
const RU = new Set(["", "/fonts", "/pairs", "/dizaynerlar", "/about", "/license", "/support", "/reklama"]);

/** Uzbek URL plus, for translated pages, its Russian twin — each listing the other as an alternate. */
function both(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  const uz = `${SITE_URL}${path}`;
  const ru = `${SITE_URL}/ru${path}`;
  const alternates = { languages: { uz, ru, "x-default": uz } };
  return [
    { url: uz, lastModified, alternates },
    { url: ru, lastModified, alternates },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [families, articles, works, designers] = await Promise.all([
    db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.work.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.designer.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...STATIC.flatMap((p) => (RU.has(p) ? both(p) : [{ url: `${SITE_URL}${p}` }])),
    ...families.flatMap((f) => both(`/fonts/${f.slug}`, f.updatedAt)),
    ...articles.map((a) => ({ url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt })),
    ...works.map((w) => ({ url: `${SITE_URL}/dizaynerlar/${w.slug}`, lastModified: w.updatedAt })),
    ...(designers.length ? [{ url: `${SITE_URL}/dizaynerlar/profil` }] : []),
    ...designers.map((d) => ({ url: `${SITE_URL}/dizaynerlar/profil/${d.slug}`, lastModified: d.updatedAt })),
  ];
}
