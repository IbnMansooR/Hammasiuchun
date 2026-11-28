import { db } from "@/lib/db";
import { PUBLIC_FAMILY } from "@/lib/license";
import { cardInclude, toCard } from "@/lib/cards";

export const runtime = "nodejs";

const json = (body: unknown, cache = "public, max-age=30, s-maxage=60") =>
  Response.json(body, { headers: { "Cache-Control": cache } });

// Quick search (header dialog) and card lookup by slug (wishlist page).
// Only public families are ever returned.
export async function GET(req: Request) {
  const u = new URL(req.url);
  try {
    const slugsParam = u.searchParams.get("slugs");
    if (slugsParam !== null) {
      const slugs = slugsParam.split(",").map((s) => s.replace(/[^a-z0-9-]/gi, "").toLowerCase()).filter(Boolean).slice(0, 100);
      if (!slugs.length) return json({ items: [] });
      const rows = await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: slugs } }, include: cardInclude });
      const order = new Map(slugs.map((s, i) => [s, i]));
      rows.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
      return json({ items: rows.map(toCard) }, "private, max-age=30");
    }

    const q = (u.searchParams.get("q") ?? "").trim().replace(/[%_]/g, "").slice(0, 60);
    const rows = await db.family.findMany({
      where: { ...PUBLIC_FAMILY, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
      orderBy: [{ popularity: "desc" }, { name: "asc" }],
      take: q ? 24 : 8,
      include: cardInclude,
    });
    // Names that start with the query first, then the rest by popularity.
    const lq = q.toLowerCase();
    const ranked = q ? [...rows].sort((a, b) => Number(b.name.toLowerCase().startsWith(lq)) - Number(a.name.toLowerCase().startsWith(lq))) : rows;
    return json({ items: ranked.slice(0, 8).map(toCard) });
  } catch {
    return json({ items: [] }, "no-store");
  }
}
