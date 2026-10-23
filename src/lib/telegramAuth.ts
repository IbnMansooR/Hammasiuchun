// "Log in with Telegram" (Login Widget, redirect flow). The widget sends the
// browser back to /api/auth/telegram?id=…&auth_date=…&hash=…; the hash proves
// Telegram produced the data: HMAC-SHA256 of the sorted "key=value" lines, keyed
// by SHA-256 of the bot token. https://core.telegram.org/widgets/login#checking-authorization
import crypto from "node:crypto";
import { unstable_cache } from "next/cache";
import { SITE_URL } from "./site";

export const telegramEnabled = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
export const telegramBot = (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");

// The widget only works after @BotFather "/setdomain" points the bot at this site; until then
// Telegram draws "Bot domain invalid" inside it. Ask Telegram (cached for 10 minutes) so the
// button appears on its own once the domain is set. TELEGRAM_LOGIN=on|off overrides the check.
const loginWidgetWorks = unstable_cache(
  async (bot: string, origin: string): Promise<boolean> => {
    try {
      const res = await fetch(`https://oauth.telegram.org/embed/${encodeURIComponent(bot)}?origin=${encodeURIComponent(origin)}`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok && !/domain invalid|username invalid/i.test(await res.text());
    } catch {
      return false;
    }
  },
  ["tg-login-widget"],
  { revalidate: 600 },
);

/** The bot username for the login widget, or null when the widget would not work. */
export async function telegramLoginBot(): Promise<string | null> {
  const mode = process.env.TELEGRAM_LOGIN;
  if (!telegramEnabled || mode === "off") return null;
  if (mode === "on") return telegramBot;
  return (await loginWidgetWorks(telegramBot, SITE_URL)) ? telegramBot : null;
}

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
