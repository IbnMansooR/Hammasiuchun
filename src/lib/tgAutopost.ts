// The bot posts the site's fonts to the channel by itself: one family at a time, at the times
// the admin sets (Tashkent), in an order the admin can see and change, as an album of specimen
// posters (lib/fontPoster). The database's pg_cron calls /api/cron/autopost every 5 minutes; the
// daily Vercel cron calls it too, as a fallback.
import { db } from "./db";
import { PUBLIC_FAMILY } from "./license";
import { getTgState, updateTgState, type TgAutopost } from "./tgState";
import { familySample } from "./fontSamples";
import { fontDraft, postDraft } from "./tgPosts";
import { esc, pause, sendMessage, type Keyboard } from "./telegram";
import { SITE_URL } from "./site";
import { tashkentDay } from "./analytics";

const DAY = 24 * 60 * 60 * 1000;
const NEW_FOR = 14 * DAY;

export type QueueItem = { slug: string; name: string; drawable: boolean; isNew: boolean };

/** Families not yet posted to the connected channel (and not skipped): new ones first, then the
 * most downloaded. Whether each can have posters is checked for the first `limit` only (one font
 * file each). `total` is the whole queue. */
export async function autopostQueue(limit = 5): Promise<{ items: QueueItem[]; total: number }> {
  const state = await getTgState();
  const posted = new Set(
    state.channel
      ? (await db.tgPost.findMany({ where: { kind: "font", chatId: state.channel.id }, select: { ref: true } })).map((r) => r.ref)
      : [],
  );
  const skip = new Set(state.autopost.skip);
  const fams = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, name: true, createdAt: true, downloads: true, popularity: true } });
  const now = Date.now();
  const waiting = fams
    .filter((f) => !posted.has(f.slug) && !skip.has(f.slug))
    .map((f) => ({ ...f, isNew: now - f.createdAt.getTime() < NEW_FOR }))
    .sort((a, b) =>
      Number(b.isNew) - Number(a.isNew) ||
      (a.isNew && b.isNew ? b.createdAt.getTime() - a.createdAt.getTime() : 0) ||
      b.downloads - a.downloads || b.popularity - a.popularity || a.name.localeCompare(b.name));
  const head = waiting.slice(0, limit);
  const drawable = await Promise.all(head.map((f) => familySample(f.slug).then(Boolean, () => false)));
  return { items: head.map(({ slug, name, isNew }, i) => ({ slug, name, drawable: drawable[i], isNew })), total: waiting.length };
}

/* ---------------- the schedule ---------------- */

const GRACE = 2 * 60 * 60 * 1000; // a slot missed (an outage) still goes out up to 2 hours late…
const RECENT = 30 * 60 * 1000; // …but never within 30 minutes of another font post

const momentOf = (day: string, time: string) => Date.parse(`${day}T${time}:00+05:00`); // Tashkent is UTC+5
const shiftDay = (day: string, n: number) => tashkentDay(new Date(Date.parse(`${day}T12:00:00+05:00`) + n * DAY));
const weekday = (day: string) => new Date(`${day}T12:00:00+05:00`).getUTCDay() || 7; // ISO: Monday 1 … Sunday 7

export type Slot = { key: string; at: number };

/** Post times that have come and are still within the grace period, oldest first (yesterday's
 * late ones included). Each has a key, claimed once so a slot never posts twice. */
export function dueSlots(a: TgAutopost, now = Date.now()): Slot[] {
  const today = tashkentDay(new Date(now));
  const out: Slot[] = [];
  for (const day of [shiftDay(today, -1), today]) {
    if (!a.days.includes(weekday(day))) continue;
    for (const t of a.times) {
      const at = momentOf(day, t);
      if (at <= now && now - at < GRACE) out.push({ key: `autopost:${day}@${t}`, at });
    }
  }
  return out.sort((x, y) => x.at - y.at);
}

/** The next post time (for the admin page). */
export function nextRun(a: TgAutopost, now = Date.now()): Date | null {
  if (!a.on || a.times.length === 0) return null;
  const today = tashkentDay(new Date(now));
  for (let d = 0; d <= 7; d++) {
    const day = shiftDay(today, d);
    if (!a.days.includes(weekday(day))) continue;
    for (const t of a.times) {
      const at = momentOf(day, t);
      if (at > now) return new Date(at);
    }
  }
  return null;
}

/** Posts a week, for "the queue lasts about N days". */
export const postsPerWeek = (a: TgAutopost) => a.times.length * a.days.length;

export type AutopostResult = { posted: string | null; reason?: "off" | "nochannel" | "notdue" | "empty" | "busy" | "recent" | "notadmin" | "send" | "unsure" | "basefile" | "gone" };

/** Post the next family when a post time has come. `force` (the admin's "post now") ignores the
 * switch and the schedule. */
export async function runAutopost({ force = false } = {}): Promise<AutopostResult> {
  const state = await getTgState();
  if (!force && !state.autopost.on) return { posted: null, reason: "off" };
  if (!state.channel) return { posted: null, reason: "nochannel" };
  if (!force) {
    const due = dueSlots(state.autopost);
    if (due.length === 0) return { posted: null, reason: "notdue" };
    // Each post time goes out once, however many crons call: the first call claims it.
    let claimed = false;
    for (const slot of due) {
      claimed = await db.loginAttempt.create({ data: { key: slot.key, count: 1 } }).then(() => true, () => false);
      if (claimed) break;
    }
    if (!claimed) return { posted: null, reason: "busy" };
    // Just posted (by hand, or a late slot catching up): let this time pass.
    const recent = await db.tgPost.findFirst({ where: { kind: "font", chatId: state.channel.id, postedAt: { gte: new Date(Date.now() - RECENT) } }, select: { id: true } });
    if (recent) return { posted: null, reason: "recent" };
  }
  const { items: [next] } = await autopostQueue(1);
  if (!next) return { posted: null, reason: "empty" };
  const draft = await fontDraft(next.slug);
  if (!draft) return { posted: null, reason: "gone" };
  const r = await postDraft(draft, draft.caption);
  if (!r.ok && r.reason === "unsure") {
    // Telegram didn't answer in time, so the album may be in the channel already. Never post it
    // twice: set the family aside and let the admin look.
    await updateTgState((s) => {
      if (!s.autopost.skip.includes(next.slug)) s.autopost.skip.push(next.slug);
      s.autopost.lastAt = new Date().toISOString();
    });
    const html =
      `⚠️ Telegram <b>${esc(next.name)}</b> albomiga vaqtida javob bermadi: post kanalga chiqqan boʻlishi ham mumkin.\n` +
      "Kanalni tekshiring. Chiqmagan boʻlsa, navbatdagi “Oʻtkazilganlarni qaytarish” tugmasini bosing.";
    for (const a of state.admins) {
      await sendMessage(a.chatId, html, [[{ text: "Navbatni boshqarish", url: `${SITE_URL}/admin/telegram#auto` }]]).catch(() => null);
      await pause(40);
    }
    return { posted: null, reason: "unsure" };
  }
  if (!r.ok) {
    // Say why nothing went out today, so a broken channel doesn't go unnoticed.
    const why: Record<string, string> = {
      basefile: "faylni fayl kanaliga yuklab boʻlmadi (bot u yerda admin ekanini tekshiring)",
      notadmin: "bot asosiy kanalda admin emas yoki post yozish huquqi yoʻq",
      send: "Telegram postni qabul qilmadi",
    };
    if (why[r.reason]) {
      const html = `⚠️ Bugungi avtomatik post chiqmadi (<b>${esc(next.name)}</b>): ${why[r.reason]}. Keyingi safar yana urinadi.`;
      for (const a of state.admins) {
        await sendMessage(a.chatId, html, [[{ text: "Telegram sozlamalari", url: `${SITE_URL}/admin/telegram#channel` }]]).catch(() => null);
        await pause(40);
      }
    }
    return { posted: null, reason: r.reason };
  }
  await updateTgState((s) => { s.autopost.lastAt = new Date().toISOString(); });

  const { items: [following] } = await autopostQueue(1);
  const link = r.username ? `https://t.me/${r.username}/${r.messageId}` : null;
  const html =
    `📣 Kanalga ${force ? "" : "avtomatik "}post chiqdi: <b>${esc(next.name)}</b>\n` +
    (following ? `Navbatda keyingisi: ${esc(following.name)}` : "Navbatda boshqa shrift qolmadi: yangi shrift qoʻshilsa, avtomatik davom etadi.");
  const keyboard: Keyboard = [[
    ...(link ? [{ text: "Postni koʻrish", url: link }] : []),
    { text: "Navbatni boshqarish", url: `${SITE_URL}/admin/telegram#auto` },
  ]];
  for (const a of state.admins) {
    await sendMessage(a.chatId, html, keyboard).catch(() => null);
    await pause(40);
  }
  return { posted: next.slug };
}
