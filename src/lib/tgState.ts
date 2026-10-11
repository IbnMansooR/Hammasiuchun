// Bot settings that change at runtime live in one Setting row, so connecting the channel or an
// admin's Telegram needs no redeploy: the chosen channel, channels the bot was made admin of, and
// the admins' private chats (where moderation buttons and the daily report go).
import crypto from "node:crypto";
import { db } from "./db";

export type TgChannel = { id: string; title: string; username: string | null };
export type TgAdmin = { chatId: string; name: string; at: string };
export type TgState = {
  channel: TgChannel | null;
  candidates: TgChannel[]; // channels where the bot is an admin (seen via my_chat_member)
  admins: TgAdmin[];
  adminNonce: { code: string; exp: number } | null; // one-time "connect my Telegram" link for an admin
};

const KEY = "telegram";
const EMPTY: TgState = { channel: null, candidates: [], admins: [], adminNonce: null };

export async function getTgState(): Promise<TgState> {
  try {
    const row = await db.setting.findUnique({ where: { key: KEY } });
    if (!row) return { ...EMPTY };
    const s = JSON.parse(row.value) as Partial<TgState>;
    return {
      channel: s.channel ?? null,
      candidates: Array.isArray(s.candidates) ? s.candidates : [],
      admins: Array.isArray(s.admins) ? s.admins : [],
      adminNonce: s.adminNonce ?? null,
    };
  } catch {
    return { ...EMPTY };
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
