// The bot advertises itself in the channel once a week ("we have a bot too, try it"): a post at the
// admin's day and time with the bot's help card and one button into the bot. The text rotates between
// a few variants so it is never the same twice in a row; the admin can write their own instead.
import { db } from "./db";
import { absoluteImage, botUsername, esc, sendPhotoOrText } from "./telegram";
import { ALL_DAYS, AUTOPOST_MAX_TIMES, getTgState, isClock } from "./tgState";
import { dueSlots, nextRun } from "./tgAutopost";

/** Like the font posts: up to four times a day (Tashkent) on the chosen weekdays. */
export type BotPromo = { on: boolean; times: string[]; days: number[]; text: string; lastAt: string | null; lastMessageId: number | null; count: number };
export const PROMO_TEXT_MAX = 600;
const KEY = "bot-promo";
const DEFAULT: BotPromo = { on: true, times: ["12:00"], days: [1], text: "", lastAt: null, lastMessageId: null, count: 0 };
const MIN_GAP_MS = 30 * 60 * 1000; // never two within half an hour, whatever the settings

// Short on purpose: a bold first line, one plain sentence, the button does the rest.
export const PROMO_VARIANTS = [
  "<b>Bizning botimiz ham bor</b>\nIstalgan matn yozing: uni shriftlarimizda rasm qilib qaytaradi. Bepul.",
  "<b>Rasmdagi shrift qaysi?</b>\nBotga rasm yuboring: saytimizdagi eng oʻxshash bepul shriftlarni topib beradi.",
  "<b>Har kuni yangi viktorina</b>\nRasmdagi shriftni toping, ball yigʻing, haftalik reytingda bellashing.",
  "<b>Matn: telefoningiz fon rasmi</b>\nIbora yozing, bot uni chiroyli shriftda fon rasmiga aylantiradi.",
  "<b>Qaysi shrift sensan?</b>\n5 ta savol: shaxsiy shriftingiz tayyor. Doʻstlaringizga yuboring.",
];
export const PROMO_IMAGE = "/api/tg-image/botpromo?v=1";

export function readBotPromo(raw: unknown): BotPromo {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<BotPromo> & { day?: number; time?: string };
  const times = Array.isArray(v.times) ? v.times.filter((t): t is string => typeof t === "string" && isClock(t)) : typeof v.time === "string" && isClock(v.time) ? [v.time] : [];
  const days = Array.isArray(v.days) ? v.days.map(Number).filter((d) => ALL_DAYS.includes(d)) : Number.isInteger(v.day) && ALL_DAYS.includes(v.day!) ? [v.day!] : [];
  return {
    on: typeof v.on === "boolean" ? v.on : DEFAULT.on,
    times: times.length ? [...new Set(times)].sort().slice(0, AUTOPOST_MAX_TIMES) : [...DEFAULT.times],
    days: days.length ? [...new Set(days)].sort() : [...DEFAULT.days],
    text: typeof v.text === "string" ? v.text.slice(0, PROMO_TEXT_MAX) : "",
    lastAt: typeof v.lastAt === "string" ? v.lastAt : null,
    lastMessageId: typeof v.lastMessageId === "number" ? v.lastMessageId : null,
    count: Number.isInteger(v.count) && v.count! >= 0 ? v.count! : 0,
  };
}

export async function getBotPromo(): Promise<BotPromo> {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    return readBotPromo(row ? JSON.parse(row.value) : null);
  } catch {
    return readBotPromo(null);
  }
}

export async function updateBotPromo(change: (s: BotPromo) => void): Promise<BotPromo> {
  const s = await getBotPromo();
  change(s);
  const value = JSON.stringify(s);
  await db.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return s;
}

/** The caption of the next post: the admin's own text (escaped), or the next variant in turn. */
export function promoCaption(p: BotPromo): string {
  return p.text.trim() ? esc(p.text.trim()) : PROMO_VARIANTS[p.count % PROMO_VARIANTS.length];
}

export type PromoResult = { posted: boolean; reason?: "off" | "nochannel" | "notdue" | "busy" | "recent" | "send"; detail?: string };

/** The next time it goes out (for the admin page). */
export const promoNext = (p: BotPromo, now = Date.now()) => nextRun({ on: p.on, times: p.times, days: p.days, lastAt: null, skip: [] }, now);

/** Posts when one of the set times has come (each claimed once; `force` = the admin's "send now"). */
export async function runBotPromo({ force = false, now = Date.now() }: { force?: boolean; now?: number } = {}): Promise<PromoResult> {
  const p = await getBotPromo();
  if (!force && (!p.on || process.env.BOT_PROMO === "off")) return { posted: false, reason: "off" };
  const { channel } = await getTgState();
  if (!channel) return { posted: false, reason: "nochannel" };
  if (!force) {
    const due = dueSlots({ on: true, times: p.times, days: p.days, lastAt: null, skip: [] }, now);
    if (due.length === 0) return { posted: false, reason: "notdue" };
    let claimed = false;
    for (const d of due) {
      claimed = await db.loginAttempt.create({ data: { key: d.key.replace(/^autopost:/, "bpromo:"), count: 1 } }).then(() => true, () => false);
      if (claimed) break;
    }
    if (!claimed) return { posted: false, reason: "busy" };
    if (p.lastAt && now - Date.parse(p.lastAt) < MIN_GAP_MS) return { posted: false, reason: "recent" };
  }
  const link = `https://t.me/${botUsername()}?start=kanalpost`;
  const r = await sendPhotoOrText(channel.id, absoluteImage(PROMO_IMAGE), promoCaption(p), [[{ text: "🤖 Botni ochish", url: link }]]).catch((e) => ({ ok: false as const, code: 0, description: String(e).slice(0, 120) }));
  if (!r.ok) return { posted: false, reason: "send", detail: ("description" in r ? r.description : "Telegram javob bermadi").slice(0, 160) };
  const messageId = (r.result as { message_id: number }).message_id;
  await updateBotPromo((s) => { s.lastAt = new Date(now).toISOString(); s.lastMessageId = messageId; s.count += 1; });
  return { posted: true };
}
