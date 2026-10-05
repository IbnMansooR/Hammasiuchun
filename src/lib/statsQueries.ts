// Queries behind /admin/stats. Days are Tashkent days (UTC+5). Because the visitor
// hash rotates daily, "visitors" over a range is a sum of daily unique visitors.
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { TZ_OFFSET_MS, tashkentDay } from "./analytics";

const DAY = 24 * 60 * 60 * 1000;
export type Period = 1 | 7 | 30 | 90;
export const PERIODS: { days: Period; label: string }[] = [
  { days: 1, label: "Bugun" }, { days: 7, label: "7 kun" }, { days: 30, label: "30 kun" }, { days: 90, label: "90 kun" },
];
export const parsePeriod = (v?: string): Period => {
  const n = Number(v);
  return n === 1 || n === 30 || n === 90 ? n : 7;
};

export type Point = { label: string; title: string; visitors: number; views: number };

export async function getStats(days: Period) {
  const todayStart = Date.parse(`${tashkentDay()}T00:00:00Z`) - TZ_OFFSET_MS; // UTC instant of Tashkent midnight
  const since = new Date(todayStart - (days - 1) * DAY);
  const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000);
  const num = (v: unknown) => Number(v ?? 0);
  const bucket = days === 1 ? Prisma.sql`'HH24'` : Prisma.sql`'YYYY-MM-DD'`;

  const [series, kpi, retention, pages, fonts, fontEvents, sources, referrals, devices, countries, live, funnel] = await Promise.all([
    db.$queryRaw<{ b: string; views: number; visitors: number }[]>`
      SELECT to_char(("at" + interval '5 hours'), ${bucket}) AS b,
             COUNT(*)::int AS views, COUNT(DISTINCT visitor)::int AS visitors
      FROM "Hit" WHERE "at" >= ${since} AND name = 'view' GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ views: number; visitors: number; ms: bigint; downloads: number; wishes: number; signups: number }[]>`
      SELECT COUNT(*) FILTER (WHERE name = 'view')::int AS views,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'view')::int AS visitors,
             COALESCE(SUM(ms) FILTER (WHERE name = 'leave'), 0)::bigint AS ms,
             COUNT(*) FILTER (WHERE name = 'download')::int AS downloads,
             COUNT(*) FILTER (WHERE name = 'wish')::int AS wishes,
             COUNT(*) FILTER (WHERE name = 'signup')::int AS signups
      FROM "Hit" WHERE "at" >= ${since}`,
    db.$queryRaw<{ single: number; total: number }[]>`
      SELECT COUNT(*) FILTER (WHERE n = 1)::int AS single, COUNT(*)::int AS total
      FROM (SELECT visitor, COUNT(*) AS n FROM "Hit" WHERE name = 'view' AND "at" >= ${since} GROUP BY visitor) t`,
    db.$queryRaw<{ path: string; views: number; visitors: number; ms: bigint }[]>`
      SELECT path, COUNT(*) FILTER (WHERE name = 'view')::int AS views,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'view')::int AS visitors,
             COALESCE(SUM(ms) FILTER (WHERE name = 'leave'), 0)::bigint AS ms
      FROM "Hit" WHERE "at" >= ${since} AND name IN ('view', 'leave')
      GROUP BY path HAVING COUNT(*) FILTER (WHERE name = 'view') > 0 ORDER BY views DESC, path LIMIT 15`,
    db.$queryRaw<{ slug: string; views: number }[]>`
      SELECT substring(path from '^/fonts/([^/]+)$') AS slug, COUNT(*)::int AS views
      FROM "Hit" WHERE "at" >= ${since} AND name = 'view' AND path ~ '^/fonts/[^/]+$'
      GROUP BY 1 ORDER BY views DESC, slug LIMIT 15`,
    db.$queryRaw<{ slug: string; name: string; n: number }[]>`
      SELECT meta AS slug, name, COUNT(*)::int AS n FROM "Hit"
      WHERE "at" >= ${since} AND name IN ('download', 'wish') AND meta IS NOT NULL GROUP BY meta, name`,
    db.$queryRaw<{ source: string; visitors: number; views: number; ms: bigint; downloads: number; signups: number }[]>`
      SELECT source, COUNT(DISTINCT visitor) FILTER (WHERE name = 'view')::int AS visitors,
             COUNT(*) FILTER (WHERE name = 'view')::int AS views,
             COALESCE(SUM(ms) FILTER (WHERE name = 'leave'), 0)::bigint AS ms,
             COUNT(*) FILTER (WHERE name = 'download')::int AS downloads,
             COUNT(*) FILTER (WHERE name = 'signup')::int AS signups
      FROM "Hit" WHERE "at" >= ${since} GROUP BY source ORDER BY visitors DESC, signups DESC, source LIMIT 12`,
    db.$queryRaw<{ ref: string; visitors: number }[]>`
      SELECT ref, COUNT(DISTINCT visitor)::int AS visitors FROM "Hit"
      WHERE "at" >= ${since} AND name = 'view' AND source = 'referral' AND ref IS NOT NULL
      GROUP BY ref ORDER BY visitors DESC, ref LIMIT 10`,
    db.$queryRaw<{ device: string; visitors: number }[]>`
      SELECT device, COUNT(DISTINCT visitor)::int AS visitors FROM "Hit"
      WHERE "at" >= ${since} AND name = 'view' GROUP BY device ORDER BY visitors DESC`,
    db.$queryRaw<{ country: string | null; visitors: number }[]>`
      SELECT country, COUNT(DISTINCT visitor)::int AS visitors FROM "Hit"
      WHERE "at" >= ${since} AND name = 'view' GROUP BY country ORDER BY visitors DESC LIMIT 8`,
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT visitor)::int AS n FROM "Hit" WHERE name IN ('view', 'leave') AND "at" >= ${halfHourAgo}`,
    db.$queryRaw<{ visited: number; sawFont: number; wished: number; downloaded: number; signed: number }[]>`
      SELECT COUNT(DISTINCT visitor) FILTER (WHERE name = 'view')::int AS visited,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'view' AND path ~ '^/fonts/[^/]+$')::int AS "sawFont",
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'wish')::int AS wished,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'download')::int AS downloaded,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'signup')::int AS signed
      FROM "Hit" WHERE "at" >= ${since}`,
  ]);

  // Chart points: every day (or hour) in the range, including empty ones.
  const byKey = new Map(series.map((r) => [r.b, r]));
  const points: Point[] = [];
  if (days === 1) {
    for (let h = 0; h < 24; h++) {
      const k = String(h).padStart(2, "0");
      const r = byKey.get(k);
      points.push({ label: `${k}:00`, title: `${k}:00`, visitors: num(r?.visitors), views: num(r?.views) });
    }
  } else {
    for (let i = 0; i < days; i++) {
      const day = tashkentDay(new Date(since.getTime() + i * DAY));
      const r = byKey.get(day);
      points.push({ label: day.slice(5).replace("-", "."), title: day, visitors: num(r?.visitors), views: num(r?.views) });
    }
  }

  const k = kpi[0];
  const visitors = num(k?.visitors);
  const views = num(k?.views);
  const ret = retention[0];
  const slugs = [...new Set([...fonts.map((f) => f.slug), ...fontEvents.map((e) => e.slug)])];
  const names = new Map((slugs.length ? await db.family.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } }) : []).map((f) => [f.slug, f.name]));
  const ev = (slug: string, name: string) => num(fontEvents.find((e) => e.slug === slug && e.name === name)?.n);

  return {
    since, days, points,
    kpi: {
      visitors, views,
      pagesPerVisit: visitors ? views / visitors : 0,
      bounce: num(ret?.total) ? num(ret?.single) / num(ret?.total) : 0,
      avgMs: views ? num(k?.ms) / views : 0,
      downloads: num(k?.downloads), wishes: num(k?.wishes), signups: num(k?.signups),
      conversion: visitors ? num(k?.signups) / visitors : 0,
    },
    live: num(live[0]?.n),
    pages: pages.map((p) => ({ path: p.path, views: num(p.views), visitors: num(p.visitors), avgMs: num(p.views) ? num(p.ms) / num(p.views) : 0 })),
    fonts: fonts.map((f) => ({
      slug: f.slug, name: names.get(f.slug) ?? f.slug, views: num(f.views),
      downloads: ev(f.slug, "download"), wishes: ev(f.slug, "wish"),
    })),
    sources: sources.map((s) => ({
      source: s.source, visitors: num(s.visitors), views: num(s.views), downloads: num(s.downloads), signups: num(s.signups),
      pagesPerVisit: num(s.visitors) ? num(s.views) / num(s.visitors) : 0,
      avgMs: num(s.views) ? num(s.ms) / num(s.views) : 0,
    })),
    referrals: referrals.map((r) => ({ ref: r.ref, visitors: num(r.visitors) })),
    devices: devices.map((d) => ({ device: d.device, visitors: num(d.visitors) })),
    countries: countries.map((c) => ({ country: c.country, visitors: num(c.visitors) })),
    funnel: [
      { label: "Saytga kirdi", n: num(funnel[0]?.visited) },
      { label: "Shrift sahifasini ochdi", n: num(funnel[0]?.sawFont) },
      { label: "♡ ga qoʻshdi", n: num(funnel[0]?.wished) },
      { label: "Yuklab oldi", n: num(funnel[0]?.downloaded) },
      { label: "Roʻyxatdan oʻtdi", n: num(funnel[0]?.signed) },
    ],
  };
}

export type Stats = Awaited<ReturnType<typeof getStats>>;
