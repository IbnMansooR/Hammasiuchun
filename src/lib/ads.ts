// Labelled ("Reklama") banner slots. One banner at most per slot, picked from the
// ads that are active and inside their dates.
import { unstable_cache } from "next/cache";
import { db, isBuildPhase } from "./db";

export const ADS_TAG = "ads";
export const PLACEMENTS = [
  { key: "home", label: "Bosh sahifa" },
  { key: "dizaynerlar", label: "Dizaynerlar sahifasi" },
] as const;
export type Placement = (typeof PLACEMENTS)[number]["key"];
export const isPlacement = (v: string): v is Placement => PLACEMENTS.some((p) => p.key === v);

export type ActiveAd = { id: number; title: string; image: string; href: string; width: number; height: number };

// Plain JSON only (unstable_cache serialises it). The date window is applied at read time.
const cachedAds = unstable_cache(
  async (placement: string) => {
    const rows = await db.ad.findMany({
      where: { placement, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      select: { id: true, title: true, image: true, href: true, startsAt: true, endsAt: true },
    });
    return rows.map((r) => ({ ...r, startsAt: r.startsAt?.toISOString() ?? null, endsAt: r.endsAt?.toISOString() ?? null }));
  },
  ["active-ads-v1"],
  { revalidate: 60, tags: [ADS_TAG] },
);

/** The banner to show in a slot right now, or null. Rotates at random when several are live. */
export async function getActiveAd(placement: Placement): Promise<ActiveAd | null> {
  if (isBuildPhase) return null;
  try {
    const now = Date.now();
    const live = (await cachedAds(placement)).filter(
      (a) => (!a.startsAt || Date.parse(a.startsAt) <= now) && (!a.endsAt || Date.parse(a.endsAt) > now),
    );
    if (!live.length) return null;
    const pick = live[Math.floor(Math.random() * live.length)];
    const m = await db.media.findFirst({ where: { url: pick.image }, select: { width: true, height: true } });
    return { id: pick.id, title: pick.title, image: pick.image, href: pick.href, width: m?.width ?? 1200, height: m?.height ?? 300 };
  } catch {
    return null; // a banner must never take a page down
  }
}
