// Paid posts in the Telegram channel. The admin writes one (text, picture, button) and sets the
// time; the 5-minute cron sends it marked #reklama and, if asked, deletes it after N hours
// (Telegram lets a bot delete its channel posts only within 48 hours). The button goes through
// /r/<id>, so the advertiser's report can count real clicks.
import crypto from "node:crypto";
import { db } from "./db";
import { SITE_URL } from "./site";
import { absoluteImage, esc, pause, sendMessage, sendPhotoOrText, tg, type Keyboard, type TgMessage } from "./telegram";
import { getTgState } from "./tgState";
import { messageLink } from "./tgFiles";
import { setAdRequestStatus } from "./adSales";
import { adminPress, answer, type CallbackQuery } from "./tgAdmin";

export const DELETE_AFTER = [0, 6, 12, 24, 47] as const; // hours; 0 = keep
export const TEXT_MAX_PHOTO = 900; // Telegram allows 1024 for a caption, with room for the mark
export const TEXT_MAX = 3500;
const GRACE = 6 * 60 * 60 * 1000;

export const reportToken = () => crypto.randomBytes(18).toString("base64url");
export const reportUrl = (token: string) => `${SITE_URL}/reklama/hisobot/${token}`;
export const clickUrl = (id: number) => `${SITE_URL}/r/${id}`;

/** The post as it goes out: the advertiser's text, then the #reklama mark. */
export function adHtml(text: string): string {
  return `${esc(text.trim())}\n\n#reklama`;
}

async function tellAdmins(html: string, keyboard?: Keyboard) {
  const { admins } = await getTgState();
  for (const a of admins) {
    await sendMessage(a.chatId, html, keyboard).catch(() => null);
    await pause(40);
  }
}

/** Sends one ad now (already claimed by the caller). */
async function postAd(id: number): Promise<void> {
  const ad = await db.channelAd.findUnique({ where: { id } });
  if (!ad) return;
  const { channel } = await getTgState();
  const fail = async (error: string) => {
    await db.channelAd.update({ where: { id }, data: { status: "failed", error } });
    await tellAdmins(`⚠️ Reklama posti #${id}${ad.advertiser ? ` (${esc(ad.advertiser)})` : ""} kanalga chiqmadi: ${esc(error)}`, [[{ text: "Admin panel", url: `${SITE_URL}/admin/ads/channel` }]]);
  };
  if (!channel) return fail("kanal ulanmagan");
  const keyboard: Keyboard | undefined = ad.href && ad.buttonText ? [[{ text: ad.buttonText, url: clickUrl(ad.id) }]] : undefined;
  const r = await sendPhotoOrText(channel.id, absoluteImage(ad.image), adHtml(ad.text), keyboard).catch(() => null);
  if (!r?.ok) return fail(r && !r.ok ? r.description.slice(0, 200) : "Telegram javob bermadi");
  const msg = r.result as TgMessage;
  await db.channelAd.update({ where: { id }, data: { status: "posted", chatId: channel.id, messageId: msg.message_id, postedAt: new Date(), error: null } });
  if (ad.requestId) await setAdRequestStatus(ad.requestId, "done").catch(() => false);
  await tellAdmins(
    `📣 Reklama posti #${id}${ad.advertiser ? ` (${esc(ad.advertiser)})` : ""} kanalga chiqdi.${ad.deleteAfterH ? ` ${ad.deleteAfterH} soatdan keyin oʻchiriladi.` : ""}`,
    [[{ text: "Postni koʻrish", url: messageLink(channel, msg.message_id) }, { text: "Hisobot", url: reportUrl(ad.reportToken) }]],
  );
}

/** Due posts out, expired posts deleted. Called by the 5-minute cron; cheap when nothing is due. */
export async function runChannelAds(now = new Date()): Promise<{ posted: number; deleted: number }> {
  let posted = 0;
  let deleted = 0;
  // Missed by more than the grace window (an outage): not sent late, the admin is told.
  const missed = await db.channelAd.findMany({ where: { status: "scheduled", postAt: { lt: new Date(now.getTime() - GRACE) } }, select: { id: true } });
  for (const m of missed) {
    if ((await db.channelAd.updateMany({ where: { id: m.id, status: "scheduled" }, data: { status: "failed", error: "vaqti oʻtib ketdi" } })).count) {
      await tellAdmins(`⚠️ Reklama posti #${m.id} oʻz vaqtida chiqmadi (6 soatdan koʻp kechikdi). Vaqtini yangilab, qayta rejalashtiring.`);
    }
  }
  const due = await db.channelAd.findMany({ where: { status: "scheduled", postAt: { lte: now } }, orderBy: { postAt: "asc" }, take: 3, select: { id: true } });
  for (const d of due) {
    // Claimed first: overlapping cron calls never send it twice.
    if (!(await db.channelAd.updateMany({ where: { id: d.id, status: "scheduled" }, data: { status: "posting" } })).count) continue;
    await postAd(d.id);
    posted++;
  }
  const live = await db.channelAd.findMany({ where: { status: "posted", deleteAfterH: { gt: 0 } }, select: { id: true, postedAt: true, deleteAfterH: true, chatId: true, messageId: true } });
  for (const a of live) {
    if (!a.postedAt || !a.deleteAfterH || a.postedAt.getTime() + a.deleteAfterH * 3600_000 > now.getTime()) continue;
    if (!(await db.channelAd.updateMany({ where: { id: a.id, status: "posted" }, data: { status: "deleted", deletedAt: now } })).count) continue;
    const r = await tg("deleteMessage", { chat_id: a.chatId, message_id: a.messageId }).catch(() => null);
    if (!r?.ok) {
      await db.channelAd.update({ where: { id: a.id }, data: { error: "Telegram postni oʻchirmadi: uni kanalda qoʻlda oʻchiring" } });
      await tellAdmins(`⚠️ Reklama posti #${a.id}ni oʻchirib boʻlmadi. Uni kanalda qoʻlda oʻchiring.`);
    }
    deleted++;
  }
  return { posted, deleted };
}

/** ✅ / ❌ on an enquiry in the admin's Telegram. */
export async function handleAdRequestCallback(q: CallbackQuery): Promise<void> {
  if (!(await adminPress(q))) return;
  const m = /^ad:([ax]):(\d{1,9})$/.exec(q.data ?? "");
  if (!m) {
    await answer(q.id, "");
    return;
  }
  const ok = await setAdRequestStatus(Number(m[2]), m[1] === "a" ? "accepted" : "rejected");
  await answer(q.id, ok ? (m[1] === "a" ? "Qabul qilindi: arizachiga xabar bordi" : "Rad etildi") : "Ariza topilmadi");
}
