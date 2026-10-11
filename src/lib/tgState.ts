// Bot settings that change at runtime live in one Setting row, so connecting the channel or an
// admin's Telegram needs no redeploy: the chosen channel, channels the bot was made admin of, and
// the admins' private chats (where moderation buttons and the daily report go).
import crypto from "node:crypto";
import { db } from "./db";
import { readQuoteState, type QuoteState } from "./quotes";

export type TgChannel = { id: string; title: string; username: string | null };
export type TgAdmin = { chatId: string; name: string; at: string };
/** Automatic font posts to the channel (lib/tgAutopost). */
export type TgAutopost = { on: boolean; every: number; lastAt: string | null; skip: string[] };
export const AUTOPOST_EVERY = [1, 2, 3, 7] as const; // days between posts
export type TgState = {
  channel: TgChannel | null;
  candidates: TgChannel[]; // channels where the bot is an admin (seen via my_chat_member)
  admins: TgAdmin[];
  adminNonce: { code: string; exp: number } | null; // one-time "connect my Telegram" link for an admin
  autopost: TgAutopost;
  quotes: QuoteState; // the poster quotes the admin added, switched off, and used lately (lib/quotes)
};

const KEY = "telegram";
const AUTOPOST_DEFAULT: TgAutopost = { on: true, every: 1, lastAt: null, skip: [] };
const empty = (): TgState => ({ channel: null, candidates: [], admins: [], adminNonce: null, autopost: { ...AUTOPOST_DEFAULT }, quotes: readQuoteState(null) });

function readAutopost(v: unknown): TgAutopost {
  const a = (v && typeof v === "object" ? v : {}) as Partial<TgAutopost>;
  return {
    on: typeof a.on === "boolean" ? a.on : AUTOPOST_DEFAULT.on,
    every: (AUTOPOST_EVERY as readonly number[]).includes(Number(a.every)) ? Number(a.every) : AUTOPOST_DEFAULT.every,
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
