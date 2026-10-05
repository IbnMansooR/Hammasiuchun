// Server-side helpers for the first-party analytics (see /api/track and
// /admin/stats). No cookies identify anyone: a visitor is an HMAC of
// (IP, browser) keyed by a secret that changes every Tashkent day, so the same
// person cannot be followed from one day to the next and no raw IP is kept.
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "./db";

export const TZ_OFFSET_MS = 5 * 60 * 60 * 1000; // Tashkent is a fixed UTC+5
export const SOURCE_COOKIE = "fk_src";
export const SOURCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** "2026-10-05" in Tashkent. */
export function tashkentDay(d = new Date()): string {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export function visitorId(ip: string, ua: string, now = new Date()): string {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-set-SESSION_SECRET-please";
  const dayKey = crypto.createHmac("sha256", secret).update(`visitor-v1:${tashkentDay(now)}`).digest();
  return crypto.createHmac("sha256", dayKey).update(`${ip}|${ua}`).digest("base64url").slice(0, 22);
}

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|curl\/|wget|python-requests|httpclient|axios|node-fetch|go-http|java\/|okhttp|monitor|uptime|pingdom|gtmetrix|semrush|ahrefs|mj12|dotbot|bingpreview|vercel|checkly|postman/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|kindle|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Lower-case label safe to store and show: letters, digits, . _ - */
export function cleanLabel(s: string | null | undefined, max = 24): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, max);
}

const REF_HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, "telegram"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)yandex\./, "yandex"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "x"],
  [/(^|\.)pinterest\./, "pinterest"],
  [/(^|\.)behance\.net$/, "behance"],
];

/** In-app browsers say who sent the visitor even when there is no referrer. */
function sourceFromUa(ua: string): string | null {
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "tiktok";
  if (/Telegram/i.test(ua)) return "telegram";
  return null;
}

/** Where did this visit come from? utm_source wins, then the referrer, then the in-app browser. */
export function classifySource(o: { utm?: string | null; referrer?: string | null; ua: string; ownHost: string }): { source: string; ref: string | null } {
  let ref: string | null = null;
  if (o.referrer) {
    try {
      const h = new URL(o.referrer).hostname.toLowerCase();
      if (h && h !== o.ownHost && !h.endsWith(".feekrfont.uz")) ref = h.slice(0, 80);
    } catch { /* not a URL */ }
  }
  const utm = cleanLabel(o.utm);
  if (utm) return { source: utm, ref };
  if (ref) {
    const known = REF_HOSTS.find(([re]) => re.test(ref!));
    return { source: known ? known[1] : "referral", ref };
  }
  return { source: sourceFromUa(o.ua) ?? "direct", ref: null };
}

export function clientIpOf(h: Headers): string {
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Record an event from server code (e.g. a sign-up). The traffic source comes from the fk_src cookie. */
export async function recordServerHit(name: string, meta?: string, path = "/"): Promise<void> {
  try {
    const [h, c] = await Promise.all([headers(), cookies()]);
    const ua = h.get("user-agent") ?? "";
    await db.hit.create({
      data: {
        name,
        path,
        visitor: visitorId(clientIpOf(h), ua),
        source: cleanLabel(c.get(SOURCE_COOKIE)?.value) || sourceFromUa(ua) || "direct",
        device: deviceOf(ua),
        country: /^[A-Z]{2}$/.test(h.get("x-vercel-ip-country") ?? "") ? h.get("x-vercel-ip-country") : null,
        meta: meta ? meta.slice(0, 80) : null,
      },
    });
  } catch {
    /* statistics must never break a sign-up */
  }
}
