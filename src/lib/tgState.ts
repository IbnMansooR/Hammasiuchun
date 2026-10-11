// Bot settings that change at runtime live in one Setting row, so connecting the channel or an
// admin's Telegram needs no redeploy: the chosen channel, channels the bot was made admin of, and
// the admins' private chats (where moderation buttons and the daily report go).
import crypto from "node:crypto";
import { db } from "./db";
import { readQuoteState, type QuoteState } from "./quotes";

export type TgChannel = { id: string; title: string; username: string | null };
export type TgAdmin = { chatId: string; name: string; at: string };
/** Automatic font posts to the channel (lib/tgAutopost). */
/** times: "HH:MM" in Tashkent, days: ISO weekdays (1 = Monday). */
export type TgAutopost = { on: boolean; times: string[]; days: number[]; lastAt: string | null; skip: string[] };
export const AUTOPOST_MAX_TIMES = 4;
export const AUTOPOST_MIN_GAP = 30; // minutes between two post times
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const isClock = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export type TgState = {
  channel: TgChannel | null;
  /** The file channel: each posted font's ZIP is kept there, and channel posts link to it (lib/tgFiles). */
  base: TgChannel | null;
  candidates: TgChannel[]; // channels where the bot is an admin (seen via my_chat_member)
  admins: TgAdmin[];
  adminNonce: { code: string; exp: number } | null; // one-time "connect my Telegram" link for an admin
  autopost: TgAutopost;
  quotes: QuoteState; // the poster quotes the admin added, switched off, and used lately (lib/quotes)
};

const KEY = "telegram";
const AUTOPOST_DEFAULT: TgAutopost = { on: true, times: ["09:00", "20:00"], days: ALL_DAYS, lastAt: null, skip: [] };
const empty = (): TgState => ({ channel: null, base: null, candidates: [], admins: [], adminNonce: null, autopost: { ...AUTOPOST_DEFAULT }, quotes: readQuoteState(null) });

function readAutopost(v: unknown): TgAutopost {
  const a = (v && typeof v === "object" ? v : {}) as Partial<TgAutopost>;
  return {
    on: typeof a.on === "boolean" ? a.on : AUTOPOST_DEFAULT.on,
    times: Array.isArray(a.times) && a.times.some((t) => typeof t === "string" && isClock(t))
      ? [...new Set(a.times.filter((t): t is string => typeof t === "string" && isClock(t)))].sort().slice(0, AUTOPOST_MAX_TIMES)
      : [...AUTOPOST_DEFAULT.times],
    days: Array.isArray(a.days) && a.days.some((d) => ALL_DAYS.includes(Number(d)))
      ? [...new Set(a.days.map(Number).filter((d) => ALL_DAYS.includes(d)))].sort()
      : [...ALL_DAYS],
    lastAt: typeof a.lastAt === "string" ? a.lastAt : null,
    skip: Array.isArray(a.skip) ? a.skip.filter((s): s is string => typeof s === "string").slice(0, 500) : [],
  };
}

export async function getTgState(): Promise<TgState> {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    if (!row) return empty();
    const s = JSON.parse(row.value) as Partial<TgState>;
    return {
      channel: s.channel ?? null,
      base: s.base ?? null,
      candidates: Array.isArray(s.candidates) ? s.candidates : [],
      admins: Array.isArray(s.admins) ? s.admins : [],
      adminNonce: s.adminNonce ?? null,
      autopost: readAutopost(s.autopost),
      quotes: readQuoteState(s.quotes),
    };
  } catch {
    return empty();
  }
}

export async function updateTgState(change: (s: TgState) => TgState | void): Promise<TgState> {
  const current = await getTgState();
  const next = change(current) ?? current;
  const value = JSON.stringify(next);
  await db.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return next;
}

export const isTgAdmin = (s: TgState, chatId: string | number) => s.admins.some((a) => a.chatId === String(chatId));

/** Short random code usable in a /start payload ([A-Za-z0-9_-], ≤ 64 chars in total). */
export const linkCode = () => crypto.randomBytes(18).toString("base64url");

export const LINK_TTL_MS = 15 * 60 * 1000;
