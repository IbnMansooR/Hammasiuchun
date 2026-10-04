import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_FAMILY } from "@/lib/license";

// Rendered per request so the build never needs the DB; ~2.4k families is well
// under the 50k-URL sitemap limit.
export const dynamic = "force-dynamic";

const STATIC = ["", "/fonts", "/pairs", "/blog", "/about", "/license", "/support"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [families, articles] = await Promise.all([
    db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...STATIC.map((p) => ({ url: `${SITE_URL}${p}` })),
    ...families.map((f) => ({ url: `${SITE_URL}/fonts/${f.slug}`, lastModified: f.updatedAt })),
    ...articles.map((a) => ({ url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt })),
  ];
}
