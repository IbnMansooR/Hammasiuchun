// The advertiser's report: real numbers for one banner or one channel post, behind a secret link
// the admin hands over (lib/channelAds reportUrl). Not indexed, not linked from anywhere.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getTgState } from "@/lib/tgState";
import { messageLink } from "@/lib/tgFiles";
import { PLACEMENTS } from "@/lib/ads";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reklama hisoboti", robots: { index: false, follow: false } };

type Day = { d: string; views: number; clicks: number; uniq: number };

export default async function AdReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) notFound();
  const [banner, post] = await Promise.all([
    db.ad.findUnique({ where: { reportToken: token } }),
    db.channelAd.findUnique({ where: { reportToken: token } }),
  ]);
  if (!banner && !post) notFound();

  let days: Day[] = [];
  let title = "";
  let facts: [string, string][] = [];
  let totals: [string, string][] = [];
  let postLink: string | null = null;

  if (banner) {
    const id = String(banner.id);
    days = await db.$queryRaw<Day[]>`
      SELECT to_char(("at" AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS d,
             COUNT(*) FILTER (WHERE name = 'ad_view')::int AS views,
             COUNT(*) FILTER (WHERE name = 'ad_click')::int AS clicks,
             COUNT(DISTINCT visitor) FILTER (WHERE name = 'ad_click')::int AS uniq
      FROM "Hit" WHERE name IN ('ad_view', 'ad_click') AND meta = ${id} AND "at" >= now() - interval '180 days'
      GROUP BY 1 ORDER BY 1 DESC`;
    const v = days.reduce((a, x) => a + x.views, 0);
    const c = days.reduce((a, x) => a + x.clicks, 0);
    title = banner.title;
    facts = [
      ["Joy", `Saytda banner · ${PLACEMENTS.find((p) => p.key === banner.placement)?.label ?? banner.placement}`],
      ["Muddat", `${banner.startsAt ? formatDateTime(banner.startsAt) : "boshidan"} — ${banner.endsAt ? formatDateTime(banner.endsAt) : "cheklovsiz"}`],
      ["Holat", banner.isActive && (!banner.endsAt || banner.endsAt > new Date()) ? "Saytda" : "Tugagan"],
    ];
    totals = [[formatNumber(v), "koʻrish"], [formatNumber(c), "bosish"], [v ? `${((c / v) * 100).toFixed(2)}%` : "—", "CTR"]];
  } else if (post) {
    const id = String(post.id);
    days = await db.$queryRaw<Day[]>`
      SELECT to_char(("at" AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS d, 0 AS views,
             COUNT(*)::int AS clicks, COUNT(DISTINCT visitor)::int AS uniq
      FROM "Hit" WHERE name = 'tgad_click' AND meta = ${id}
      GROUP BY 1 ORDER BY 1 DESC`;
    const { channel } = await getTgState();
    if (post.status === "posted" && channel && post.chatId === channel.id && post.messageId) postLink = messageLink(channel, post.messageId);
    const c = days.reduce((a, x) => a + x.clicks, 0);
    const u = await db.hit.groupBy({ by: ["visitor"], where: { name: "tgad_click", meta: id } }).then((r) => r.length);
    title = post.advertiser || `Kanal posti #${post.id}`;
    const status: Record<string, string> = { scheduled: "Rejalashtirilgan", posting: "Yuborilmoqda", posted: "Kanalda", deleted: "Muddati tugab oʻchirildi", failed: "Chiqmadi", canceled: "Bekor qilindi" };
    facts = [
      ["Joy", "Telegram kanal posti"],
      ["Chiqish vaqti", formatDateTime(post.postedAt ?? post.postAt)],
      ["Holat", status[post.status] ?? post.status],
      ...(post.deleteAfterH ? [["Turish muddati", `${post.deleteAfterH} soat`] as [string, string]] : []),
    ];
    totals = [[formatNumber(c), "tugma bosildi"], [formatNumber(u), "noyob odam"]];
  }

  return (
    <div className="container ads-page">
      <header className="page-head narrow">
        <div className="eyebrow">Reklama hisoboti · Feekr</div>
        <h1>{title}</h1>
      </header>
      <section>
        <dl className="ads-stats">
          {totals.map(([n, l]) => <div key={l}><dt>{l}</dt><dd>{n}</dd></div>)}
        </dl>
        <dl className="ads-facts">
          {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {postLink && <p><a className="link" href={postLink} target="_blank" rel="noopener">Postni Telegramda koʻrish ↗</a> <span className="muted">(koʻrishlar soni post ostida koʻrinadi)</span></p>}
      </section>
      <section aria-labelledby="rep-days">
        <h2 id="rep-days">Kunlar boʻyicha</h2>
        {days.length === 0 ? (
          <p className="muted">Hali maʼlumot yoʻq.</p>
        ) : (
          <div className="table-wrap">
            <table className="ads-table">
              <thead><tr><th scope="col">Kun</th>{banner && <th scope="col">Koʻrish</th>}<th scope="col">Bosish</th><th scope="col">Noyob</th>{banner && <th scope="col">CTR</th>}</tr></thead>
              <tbody>
                {days.map((x) => (
                  <tr key={x.d}>
                    <td>{x.d}</td>
                    {banner && <td>{formatNumber(x.views)}</td>}
                    <td>{formatNumber(x.clicks)}</td>
                    <td>{formatNumber(x.uniq)}</td>
                    {banner && <td>{x.views ? `${((x.clicks / x.views) * 100).toFixed(2)}%` : "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted ads-note">Koʻrish: banner ekranning yarmidan koʻpi bir soniya koʻringanda. Bosish: havolaga oʻtish. Botlar va sayt adminlari sanalmaydi. Vaqt: Toshkent.</p>
      </section>
    </div>
  );
}
