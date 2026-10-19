// The bot advertises itself in the channel once a week ("we have a bot too, try it"): a post at the
// admin's day and time with the bot's help card and one button into the bot. The text rotates between
// a few variants so it is never the same twice in a row; the admin can write their own instead.
import { db } from "./db";
import { absoluteImage, botUsername, esc, sendPhotoOrText } from "./telegram";
import { getTgState, isClock } from "./tgState";
import { HELP_IMAGE_VERSION } from "./tgHelp";
import { dueSlots } from "./tgAutopost";

export type BotPromo = { on: boolean; day: number; time: string; text: string; lastAt: string | null; lastMessageId: number | null; count: number };
export const PROMO_TEXT_MAX = 600;
const KEY = "bot-promo";
const DEFAULT: BotPromo = { on: true, day: 3, time: "12:00", text: "", lastAt: null, lastMessageId: null, count: 0 };
const MIN_GAP_MS = 5 * 24 * 3600 * 1000; // never twice within five days, whatever the settings

export const PROMO_VARIANTS = [
  "🤖 <b>Bizning botimiz ham bor!</b>\n\nIstalgan matn yozing: uni bizning shriftlarda rasm qilib qaytaradi. Bepul, roʻyxatdan oʻtish shart emas.\n\nSinab koʻring 👇",
  "🎯 <b>Botimizda har kuni viktorina!</b>\n\nRasmdagi shriftni toping, ball va streak yigʻing, haftalik reytingda bellashing. Botda fon rasmi, brend nomi va shrift topish ham bor.\n\nBoshlang 👇",
  "🔍 <b>Shriftni topib beradigan bot</b>\n\nRasmdagi yozuvni yuboring: saytimizdagi eng oʻxshash bepul shriftlarni koʻrsatadi. Matningizni 4 xil shriftda ham koʻrsatib beradi.\n\nSinab koʻring 👇",
  "🖼 <b>Matningizni fon rasmiga aylantiring</b>\n\nFeekr botiga istalgan ibora yozing: u telefoningiz uchun fon rasmiga aylanadi. Brend nomingizga mos shriftni ham tanlab beradi.\n\nBotni oching 👇",
  "🎭 <b>Qaysi shrift sensan?</b>\n\n5 ta savolga javob bering, shaxsiy shriftingizni bilib oling va doʻstlaringizga yuboring. Hammasi Feekr botida, bepul.\n\nSinab koʻring 👇",
];

export function readBotPromo(raw: unknown): BotPromo {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<BotPromo>;
  return {
    on: typeof v.on === "boolean" ? v.on : DEFAULT.on,
    day: Number.isInteger(v.day) && v.day! >= 1 && v.day! <= 7 ? v.day! : DEFAULT.day,
    time: typeof v.time === "string" && isClock(v.time) ? v.time : DEFAULT.time,
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

export type PromoResult = { posted: boolean; reason?: "off" | "nochannel" | "notdue" | "busy" | "recent" | "send" };

/** Posts when the day and time have come (once; `force` = the admin's "send now"). */
export async function runBotPromo({ force = false, now = Date.now() }: { force?: boolean; now?: number } = {}): Promise<PromoResult> {
  const p = await getBotPromo();
  if (!force && (!p.on || process.env.BOT_PROMO === "off")) return { posted: false, reason: "off" };
  const { channel } = await getTgState();
  if (!channel) return { posted: false, reason: "nochannel" };
  if (!force) {
    const due = dueSlots({ on: true, times: [p.time], days: [p.day], lastAt: null, skip: [] }, now);
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
  const r = await sendPhotoOrText(channel.id, absoluteImage(`/api/tg-image/help?v=${HELP_IMAGE_VERSION}`), promoCaption(p), [[{ text: "🤖 Botni ochish", url: link }]]).catch(() => null);
  if (!r?.ok) return { posted: false, reason: "send" };
  const messageId = (r.result as { message_id: number }).message_id;
  await updateBotPromo((s) => { s.lastAt = new Date(now).toISOString(); s.lastMessageId = messageId; s.count += 1; });
  return { posted: true };
}
