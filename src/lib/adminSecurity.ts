// Admin sign-in safety: a one-time code in the admin's Telegram (two-factor), alerts about
// sign-ins and attacks, and a password fingerprint inside the session so that changing the
// password signs out every other device.
import crypto from "node:crypto";
import { headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "./session";
import { botEnabled, esc, sendMessage } from "./telegram";
import { getTgState } from "./tgState";
import { formatDateTime } from "./format";

export const TWOFA_COOKIE = "feekr_2fa";
export const CODE_TTL_S = 5 * 60;
export const MAX_CODE_TRIES = 5;
export const MIN_ADMIN_PASSWORD = 12;

const hmac = (data: string) => crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");

/** Changes whenever the password hash changes; stored in the session token. */
export const passwordVersion = (passwordHash: string) => hmac(`pv\n${passwordHash}`).slice(0, 16);

/** Telegram chats that receive admin codes and alerts. Empty = two-factor off. */
export async function adminChats(): Promise<string[]> {
  if (!botEnabled()) return [];
  return (await getTgState()).admins.map((a) => a.chatId);
}

/** Two-factor applies when an admin Telegram is linked, unless switched off in Vercel (ADMIN_2FA=off). */
export async function twoFactorChats(): Promise<string[]> {
  if (process.env.ADMIN_2FA === "off") return [];
  return adminChats();
}

/** "Chrome · Windows" — enough to recognise a device in an alert. */
export function describeUa(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /YaBrowser/.test(ua) ? "Yandex" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Brauzer";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export async function requestInfo(): Promise<{ ip: string; device: string; country: string }> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "nomaʼlum";
  return { ip: ip.slice(0, 60), device: describeUa(h.get("user-agent") ?? ""), country: (h.get("x-vercel-ip-country") ?? "").slice(0, 2) };
}

/** One line describing where a request came from, for alerts (HTML-escaped). */
export async function whereLine(): Promise<string> {
  const r = await requestInfo();
  return `IP: <code>${esc(r.ip)}</code>${r.country ? ` (${esc(r.country)})` : ""} · ${esc(r.device)} · ${esc(formatDateTime(new Date()))}`;
}

/** Best effort: alerts must never break a sign-in. */
export async function alertAdmins(html: string): Promise<number> {
  const chats = await adminChats();
  let sent = 0;
  for (const c of chats) {
    const r = await sendMessage(c, html).catch(() => null);
    if (r?.ok) sent++;
  }
  return sent;
}

/* ---------------- the pending second step ---------------- */

export const codeHash = (jti: string, code: string) => hmac(`2fa\n${jti}\n${code}`);

export function newCode(): { code: string; jti: string } {
  return { code: String(crypto.randomInt(0, 1_000_000)).padStart(6, "0"), jti: crypto.randomUUID() };
}

export async function sendCode(chats: string[], code: string): Promise<boolean> {
  const where = await whereLine();
  const text =
    `🔐 Feekr admin panelga kirish kodi: <b>${code}</b>\n` +
    `${Math.round(CODE_TTL_S / 60)} daqiqa amal qiladi. Kodni hech kimga bermang.\n\n${where}\n\n` +
    `Siz kirmayotgan boʻlsangiz, parolingizni birov bilgan: admin paneldan parolni almashtiring.`;
  let ok = false;
  for (const c of chats) {
    const r = await sendMessage(c, text).catch(() => null);
    if (r?.ok) ok = true;
  }
  return ok;
}

type Pending = { u: string; h: string; jti: string };

export async function signPending(p: Pending): Promise<string> {
  return new SignJWT({ ...p, typ: "admin-2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CODE_TTL_S}s`)
    .sign(getSecret());
}

export async function verifyPending(token: string | undefined): Promise<Pending | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.typ !== "admin-2fa" || typeof payload.u !== "string" || typeof payload.h !== "string" || typeof payload.jti !== "string") return null;
    return { u: payload.u, h: payload.h, jti: payload.jti };
  } catch {
    return null;
  }
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Admin password rules: long enough, not the username, not a well-known one. */
const COMMON = ["123456789012", "qwertyuiopas", "password1234", "feekrfont.uz", "feekr123456", "admin1234567", "parol1234567"];
export function weakPasswordReason(pw: string, username: string): string | null {
  if (pw.length < MIN_ADMIN_PASSWORD) return "short";
  if (pw.length > 200) return "long";
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return "username";
  if (/^(.)\1+$/.test(pw) || COMMON.some((c) => pw.toLowerCase().includes(c))) return "common";
  return null;
}
