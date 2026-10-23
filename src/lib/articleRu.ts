// Russian versions of published articles: translated by Claude once an article goes live (or by the
// admin's button for the older ones), shown on the Russian site and listed in the sitemap.
import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "./stats";
import { db } from "./db";
import { translateArticleRu } from "./translate";
import { aiOn } from "./ai";

/** One article → saved Russian text. Returns null on success or the reason. */
export async function translateOne(id: number): Promise<string | null> {
  const a = await db.article.findUnique({ where: { id }, select: { slug: true, title: true, excerpt: true, body: true, isPublished: true, bodyRu: true } });
  if (!a || !a.isPublished) return "maqola topilmadi";
  if (a.bodyRu) return null;
  const r = await translateArticleRu(a);
  if (!r.ok) return r.detail;
  await db.article.update({ where: { id }, data: { titleRu: r.ru.title, excerptRu: r.ru.excerpt || null, bodyRu: r.ru.body } });
  revalidateTag(CATALOG_TAG, { expire: 0 }); // the home page keeps its newest posts in this cache
  for (const p of [`/blog/${a.slug}`, `/ru/blog/${a.slug}`, "/blog", "/ru/blog", "/", "/ru"]) revalidatePath(p);
  return null;
}

/** After the response is sent: the new article's Russian text. Never breaks publishing. */
export function translateSoon(id: number) {
  if (!aiOn()) return;
  try {
    after(() => translateOne(id).catch(() => null));
  } catch {
    void translateOne(id).catch(() => null);
  }
}

/** The next few published articles that have no Russian text yet (newest first). */
export async function translatePending(limit = 3): Promise<{ done: number; left: number; detail?: string }> {
  const where = { isPublished: true, bodyRu: null };
  const rows = await db.article.findMany({ where, orderBy: { publishedAt: "desc" }, take: limit, select: { id: true } });
  let done = 0, detail: string | undefined;
  for (const r of rows) {
    const bad = await translateOne(r.id);
    if (bad) { detail = bad; break; }
    done++;
  }
  return { done, left: (await db.article.count({ where })), detail };
}
