import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getTgState } from "@/lib/tgState";
import { messageLink } from "@/lib/tgFiles";
import { reportUrl } from "@/lib/channelAds";
import { cancelChannelAdAction, deleteChannelAdNowAction, sendChannelAdNowAction } from "@/app/admin/adActions";
import AdsTabs from "@/components/admin/AdsTabs";
import CopyField from "@/components/admin/CopyField";
import Notice from "@/components/admin/Notice";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Admin — Kanal reklama postlari" };
export const maxDuration = 60; // "send now" posts from here

const STATUS: Record<string, [string, string]> = {
  scheduled: ["Rejalashtirilgan", "tag tag-warn"],
  posting: ["Yuborilmoqda", "tag tag-warn"],
  posted: ["Kanalda", "tag tag-ok"],
  deleted: ["Oʻchirildi", "tag tag-off"],
  failed: ["Chiqmadi", "tag tag-err"],
  canceled: ["Bekor qilindi", "tag tag-off"],
};
const OK: Record<string, string> = { saved: "Saqlandi: post vaqti kelganda kanalga chiqadi.", canceled: "Bekor qilindi.", posted: "Post kanalga chiqdi ✓", deleted: "Post kanaldan oʻchirildi." };
const ERR: Record<string, string> = { sent: "Bu post allaqachon chiqqan.", post: "Post chiqmadi: sababini pastdagi roʻyxatda koʻring.", delete: "Telegram postni oʻchirmadi (48 soatdan oshgan boʻlishi mumkin). Uni kanalda qoʻlda oʻchiring." };

export default async function ChannelAdsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const [ads, clicks, { channel }] = await Promise.all([
    db.channelAd.findMany({ orderBy: [{ postAt: "desc" }], take: 100 }),
    db.$queryRaw<{ meta: string; n: number; u: number }[]>`
      SELECT meta, COUNT(*)::int AS n, COUNT(DISTINCT visitor)::int AS u FROM "Hit" WHERE name = 'tgad_click' AND meta IS NOT NULL GROUP BY meta`,
    getTgState(),
  ]);
  const clicksOf = (id: number) => clicks.find((c) => c.meta === String(id));
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Reklama</h1>
          <p className="adm-sub">Kanalga pullik postlar: belgilangan vaqtda “#reklama” belgisi bilan chiqadi, tugma bosishlari hisobotda sanaladi.</p>
        </div>
        <Link href="/admin/ads/channel/new" className="btn btn-accent btn-sm">+ Yangi post</Link>
      </div>
      <AdsTabs current="/admin/ads/channel" />
      {ok && OK[ok] && <Notice>{OK[ok]}</Notice>}
      {error && ERR[error] && <Notice tone="error">{ERR[error]}</Notice>}
      {!channel && <Notice tone="warn">Kanal ulanmagan: postlar chiqmaydi. Admin → Telegram → Kanal.</Notice>}
      {ads.length === 0 ? (
        <div className="adm-card adm-pad"><p className="adm-text">Hali reklama posti yoʻq.</p></div>
      ) : (
        <div className="adm-card">
          <table className="adm-table">
            <thead><tr><th>Post</th><th>Vaqt</th><th>Holat</th><th>Bosish</th><th><span className="sr-only">Amallar</span></th></tr></thead>
            <tbody>
              {ads.map((a) => {
                const c = clicksOf(a.id);
                const [label, cls] = STATUS[a.status] ?? [a.status, "tag"];
                const live = a.status === "posted" && channel && a.chatId === channel.id && a.messageId ? messageLink(channel, a.messageId) : null;
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>#{a.id}{a.advertiser ? ` · ${a.advertiser}` : ""}</strong>
                      <div className="adm-ad-text">{a.text.length > 160 ? `${a.text.slice(0, 160)}…` : a.text}</div>
                      <CopyField value={reportUrl(a.reportToken)} label="Hisobot havolasi" />
                    </td>
                    <td className="nowrap">
                      {formatDateTime(a.postedAt ?? a.postAt)}
                      {a.deleteAfterH ? <><br /><span className="adm-meta">{a.deleteAfterH} soat turadi</span></> : null}
                    </td>
                    <td>
                      <span className={cls}>{label}</span>
                      {a.error && <div className="adm-meta">{a.error}</div>}
                    </td>
                    <td>{c ? `${formatNumber(c.n)} (${formatNumber(c.u)} kishi)` : "—"}</td>
                    <td className="adm-act">
                      <div className="adm-act-wrap">
                        {live && <a href={live} className="chip" target="_blank" rel="noopener">Kanalda ↗</a>}
                        {["scheduled", "failed", "canceled"].includes(a.status) && (
                          <>
                            <Link href={`/admin/ads/channel/${a.id}`} className="chip">Tahrirlash</Link>
                            <form action={sendChannelAdNowAction}>
                              <input type="hidden" name="id" value={a.id} />
                              <ConfirmButton className="chip" message="Post hozir kanalga yuborilsinmi?">Hozir yuborish</ConfirmButton>
                            </form>
                          </>
                        )}
                        {a.status === "scheduled" && (
                          <form action={cancelChannelAdAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <button className="chip">Bekor qilish</button>
                          </form>
                        )}
                        {a.status === "posted" && (
                          <form action={deleteChannelAdNowAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <ConfirmButton className="chip chip-danger" message="Post kanaldan hozir oʻchirilsinmi?">Kanaldan oʻchirish</ConfirmButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="adm-meta" style={{ marginTop: 14 }}>Post koʻrishlari soni Telegram’da post ostida koʻrinadi (bot uni ololmaydi). Hisobot havolasini reklama beruvchiga yuboring.</p>
    </>
  );
}
