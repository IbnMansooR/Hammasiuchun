// Portfolio ("Work") helpers shared by the public pages and the admin.
import { unstable_cache } from "next/cache";
import { db, isBuildPhase } from "./db";

export const WORKS_TAG = "works";

export type WorkKind = "own" | "partner";
export const KIND_LABEL: Record<string, string> = { own: "Feekr ishi", partner: "Hamkor ishi" };

export type WorkCard = {
  slug: string; title: string; summary: string | null; kind: string;
  authorName: string | null; client: string | null; year: number | null;
  tags: string[]; fonts: string[]; coverImage: string | null; isFeatured: boolean;
};

export const splitTags = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);
export const splitLines = (s: string) => s.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);

/** Uploaded file ("/uploads/...") or an absolute https URL. */
export function isSafeImageUrl(u: string): boolean {
  if (u.startsWith("/uploads/") && !u.includes("..")) return true;
  try { return new URL(u).protocol === "https:"; } catch { return false; }
}

const ORDER = [{ isFeatured: "desc" as const }, { sortOrder: "asc" as const }, { publishedAt: "desc" as const }, { id: "desc" as const }];

// Plain JSON only — unstable_cache serialises the result.
const cachedWorks = unstable_cache(
  async (): Promise<WorkCard[]> => {
    const rows = await db.work.findMany({
      where: { isPublished: true },
      orderBy: ORDER,
      select: {
        slug: true, title: true, summary: true, kind: true, authorName: true, client: true,
        year: true, tags: true, fonts: true, coverImage: true, isFeatured: true,
      },
    });
    return rows.map((w) => ({ ...w, tags: splitTags(w.tags), fonts: splitTags(w.fonts) }));
  },
  ["published-works-v1"],
  { revalidate: 3600, tags: [WORKS_TAG] },
);

export async function getPublishedWorks(): Promise<WorkCard[]> {
  if (isBuildPhase) return [];
  try { return await cachedWorks(); } catch { return []; }
}

/** Published works that credit a given font family. */
export async function worksUsingFont(slug: string): Promise<WorkCard[]> {
  return (await getPublishedWorks()).filter((w) => w.fonts.includes(slug));
}
