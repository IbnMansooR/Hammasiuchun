// The bot posts the site's fonts to the channel by itself: one family at a time, in an order
// the admin can see and change, as an album of specimen posters (lib/fontPoster).
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
 * most downloaded. Whether each can have posters is checked for the returned ones only (one font
 * file each): the catalogue has thousands of families. */
export async function autopostQueue(limit = 5): Promise<QueueItem[]> {
  const state = await getTgState();
  const posted = new Set(
    state.channel
      ? (await db.tgPost.findMany({ where: { kind: "font", chatId: state.channel.id }, select: { ref: true } })).map((r) => r.ref)
      : [],
  );
  const skip = new Set(state.autopost.skip);
  const fams = await db.family.findMany({ where: PUBLIC_FAMILY, select: { slug: true, name: true, createdAt: true, downloads: true, popularity: true } });
  const now = Date.now();
  const head = fams
    .filter((f) => !posted.has(f.slug) && !skip.has(f.slug))
    .map((f) => ({ ...f, isNew: now - f.createdAt.getTime() < NEW_FOR }))
    .sort((a, b) =>
      Number(b.isNew) - Number(a.isNew) ||
      (a.isNew && b.isNew ? b.createdAt.getTime() - a.createdAt.getTime() : 0) ||
      b.downloads - a.downloads || b.popularity - a.popularity || a.name.localeCompare(b.name))
    .slice(0, limit);
  const drawable = await Promise.all(head.map((f) => familySample(f.slug).then(Boolean, () => false)));
  return head.map(({ slug, name, isNew }, i) => ({ slug, name, drawable: drawable[i], isNew }));
}

/** The daily cron runs at 09:00 Tashkent; a few hours of slack absorbs its jitter. */
export function isDue(a: TgAutopost, now = Date.now()): boolean {
  return !a.lastAt || now - Date.parse(a.lastAt) >= a.every * DAY - 3 * 60 * 60 * 1000;
}

/** When the next scheduled post goes out (approximately: the next 09:00 run that is due). */
export function nextRun(a: TgAutopost, now = Date.now()): Date | null {
  if (!a.on) return null;
  const nineToday = Date.parse(`${tashkentDay(new Date(now))}T04:00:00Z`); // 09:00 Tashkent
  for (let d = 0; d <= 8; d++) {
    const t = nineToday + d * DAY;
    if (t > now && isDue(a, t)) return new Date(t);
  }
  return null;
}

export type AutopostResult = { posted: string | null; reason?: "off" | "nochannel" | "notdue" | "empty" | "busy" | "notadmin" | "send" | "unsure" | "gone" };

/** Post the next family. `force` (the admin's "post now") ignores the switch and the schedule. */
export async function runAutopost({ force = false } = {}): Promise<AutopostResult> {
  const state = await getTgState();
  if (!force && !state.autopost.on) return { posted: null, reason: "off" };
  if (!state.channel) return { posted: null, reason: "nochannel" };
  if (!force && !isDue(state.autopost)) return { posted: null, reason: "notdue" };
  const [next] = await autopostQueue(1);
  if (!next) return { posted: null, reason: "empty" };
  if (!force) {
    // One scheduled post a day, even if the cron fires twice: the first run claims the day.
    const claimed = await db.loginAttempt.create({ data: { key: `autopost:${tashkentDay()}`, count: 1 } }).then(() => true, () => false);
    if (!claimed) return { posted: null, reason: "busy" };
  }
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
  if (!r.ok) return { posted: null, reason: r.reason };
  await updateTgState((s) => { s.autopost.lastAt = new Date().toISOString(); });

  const [following] = await autopostQueue(1);
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
