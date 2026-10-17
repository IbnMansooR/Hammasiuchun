// Cached catalog numbers shown site-wide (footer, home, about). The DB is far
// from the functions, so these are fetched at most once per hour (or when an
// admin edit calls revalidateTag(CATALOG_TAG)).
import { unstable_cache } from "next/cache";
import { db, isBuildPhase } from "./db";
import { PUBLIC_FAMILY } from "./license";

export const CATALOG_TAG = "catalog";

type Counts = { families: number; styles: number; downloads: number };

/** The download total is shown only once it is worth showing (the counter
 * started at zero on 2026-10-04); below this the fact is simply left out. */
export const DOWNLOADS_SHOWN_FROM = 100;

// Throws on DB errors so a failure is never stored in the cache (it would show
// "0" for an hour); the wrapper below turns it into a one-off fallback.
const cachedCounts = unstable_cache(
  async (): Promise<Counts> => {
    const [families, styles, dl] = await Promise.all([
      db.family.count({ where: PUBLIC_FAMILY }),
      db.style.count({ where: { family: PUBLIC_FAMILY } }),
      db.family.aggregate({ _sum: { downloads: true } }),
    ]);
    return { families, styles, downloads: dl._sum.downloads ?? 0 };
  },
  ["public-counts-v2"],
  { revalidate: 3600, tags: [CATALOG_TAG] },
);

export async function getPublicCounts(): Promise<Counts> {
  // Don't query — or seed the cache with zeros — while `next build` prerenders the 404 page.
  if (isBuildPhase) return { families: 0, styles: 0, downloads: 0 };
  try {
    return await cachedCounts();
  } catch {
    return { families: 0, styles: 0, downloads: 0 }; // DB hiccup — never fail the page, never cache it
  }
}
