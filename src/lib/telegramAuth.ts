// "Log in with Telegram" (Login Widget, redirect flow). The widget sends the
// browser back to /api/auth/telegram?id=…&auth_date=…&hash=…; the hash proves
// Telegram produced the data: HMAC-SHA256 of the sorted "key=value" lines, keyed
// by SHA-256 of the bot token. https://core.telegram.org/widgets/login#checking-authorization
import crypto from "node:crypto";

export const telegramEnabled = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
export const telegramBot = (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");

// The redirect happens right after the user confirms; anything older is a replay.
const MAX_AGE_S = 15 * 60;

export type TelegramProfile = { id: string; username: string | null; name: string | null };

export function verifyTelegramLogin(params: URLSearchParams, now = Date.now()): TelegramProfile | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const hash = params.get("hash") ?? "";
  if (!/^[0-9a-f]{64}$/.test(hash)) return null;

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const [k, v] of params) {
    if (k === "hash") continue;
    if (seen.has(k)) return null; // Telegram never repeats a key
    seen.add(k);
    lines.push(`${k}=${v}`);
  }
  lines.sort();
  const secret = crypto.createHash("sha256").update(token).digest();
  const expected = crypto.createHmac("sha256", secret).update(lines.join("\n")).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || Math.abs(now / 1000 - authDate) > MAX_AGE_S) return null;
  const id = params.get("id") ?? "";
  if (!/^\d{1,20}$/.test(id)) return null;

  const clean = (s: string | null, max: number) => (s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);
  const username = clean(params.get("username"), 64).replace(/[^A-Za-z0-9_]/g, "");
  const name = [clean(params.get("first_name"), 40), clean(params.get("last_name"), 40)].filter(Boolean).join(" ");
  return { id, username: username || null, name: name || null };
}
