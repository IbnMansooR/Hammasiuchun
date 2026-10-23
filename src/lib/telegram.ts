// Thin client for the Telegram Bot API (https://core.telegram.org/bots/api).
// Every call returns { ok, result } or { ok: false, code, description } and never throws:
// a Telegram outage must not break a page, a server action or the webhook.
import { SITE_URL } from "./site";

const API = (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/$/, ""); // overridable for local tests

export const botToken = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
export const botUsername = () => (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "");
export const botEnabled = () => !!(botToken() && botUsername());

/** `timeout`: no answer in time, so the request may still have gone through. */
export type TgResult<T> = { ok: true; result: T } | { ok: false; code: number; description: string; timeout?: boolean };

export type TgMessage = { message_id: number; chat: { id: number; type: string } };
export type InlineButton = { text: string; url?: string; callback_data?: string };
export type Keyboard = InlineButton[][];

export async function tg<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<TgResult<T>> {
  const token = botToken();
  if (!token) return { ok: false, code: 0, description: "bot token is not set" };
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      // Telegram downloads the pictures before it answers; an album of rendered posters takes a while.
      signal: AbortSignal.timeout(method === "sendMediaGroup" ? 50_000 : method === "sendPhoto" ? 25_000 : 10_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; error_code?: number; description?: string } | null;
    if (data?.ok) return { ok: true, result: data.result as T };
    return { ok: false, code: data?.error_code ?? res.status, description: (data?.description ?? `HTTP ${res.status}`).slice(0, 200) };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, code: 0, description: timeout ? "Telegram javob bermadi" : "Telegram bilan aloqa yoʻq", timeout };
  }
}

/** A file someone sent the bot (at most `max` bytes), or null. */
export async function downloadFile(fileId: string, max = 6 * 1024 * 1024): Promise<Buffer | null> {
  const r = await tg<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
  if (!r.ok || !r.result.file_path || (r.result.file_size ?? 0) > max) return null;
  try {
    const res = await fetch(`${API}/file/bot${botToken()}/${r.result.file_path}`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= max ? buf : null;
  } catch {
    return null;
  }
}

/** Escape text for parse_mode=HTML. */
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Absolute site link, tagged so the visit is credited to Telegram in the statistics. */
export function siteLink(path: string, medium: "channel" | "bot" | "inline" = "bot"): string {
  const u = new URL(path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);
  if (u.origin === new URL(SITE_URL).origin) {
    u.searchParams.set("utm_source", "telegram");
    u.searchParams.set("utm_medium", medium);
  }
  return u.toString();
}

/** Image URLs Telegram can fetch: absolute https (site-relative paths are made absolute). */
export function absoluteImage(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("/")) return `${SITE_URL}${src}`;
  return /^https:\/\//.test(src) ? src : null;
}

export function sendMessage(chatId: string | number, html: string, keyboard?: Keyboard, extra: Record<string, unknown> = {}) {
  return tg<TgMessage>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
    ...extra,
  });
}

/** Draws one of our own pictures once ourselves, so the CDN has it when Telegram asks: Telegram gives up on a
 * picture that takes a few seconds to draw (a big font on a cold start) and the post would go out without it. */
export async function warmImage(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith(SITE_URL)) return;
  for (let i = 0; i < 2; i++) {
    const ok = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) }).then(async (r) => { await r.arrayBuffer(); return r.ok; }, () => false);
    if (ok) return;
  }
}

/** A photo with a caption; if Telegram can't fetch the image, the same text goes out as a plain message. */
export async function sendPhotoOrText(chatId: string | number, photo: string | null, html: string, keyboard?: Keyboard, extra: Record<string, unknown> = {}) {
  if (photo) {
    await warmImage(photo);
    // Twice: a picture Telegram could not fetch the first time is usually ready the second.
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await tg<TgMessage>("sendPhoto", {
        chat_id: chatId,
        photo,
        caption: html,
        parse_mode: "HTML",
        ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
        ...extra,
      });
      // 400 "wrong file identifier/HTTP URL specified", "failed to get HTTP URL content", …
      if (r.ok || r.code !== 400 || !/url|file|photo|image/i.test(r.description)) return r;
      if (attempt === 0) await new Promise((res) => setTimeout(res, 2500));
    }
  }
  return sendMessage(chatId, html, keyboard, extra);
}

/** Several pictures as one album; the caption (HTML) goes on the first. Albums can't carry buttons. */
export function sendAlbum(chatId: string | number, photos: string[], html: string, extra: Record<string, unknown> = {}) {
  return tg<TgMessage[]>("sendMediaGroup", {
    chat_id: chatId,
    media: photos.slice(0, 10).map((url, i) => ({ type: "photo", media: url, ...(i === 0 ? { caption: html, parse_mode: "HTML" } : {}) })),
    ...extra,
  });
}

/** Upload a file (bots may send up to 50 MB) with an HTML caption. */
export async function sendDocument(chatId: string | number, file: { name: string; data: Buffer }, html: string, extra: Record<string, string> = {}): Promise<TgResult<TgMessage>> {
  const token = botToken();
  if (!token) return { ok: false, code: 0, description: "bot token is not set" };
  // Text goes in the query string: multipart encoding would turn the caption's line breaks into CRLF.
  const query = new URLSearchParams({ chat_id: String(chatId), caption: html, parse_mode: "HTML", ...extra });
  const form = new FormData();
  form.set("document", new Blob([new Uint8Array(file.data)], { type: "application/zip" }), file.name);
  try {
    const res = await fetch(`${API}/bot${token}/sendDocument?${query}`, { method: "POST", body: form, signal: AbortSignal.timeout(40_000), cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: TgMessage; error_code?: number; description?: string } | null;
    if (data?.ok) return { ok: true, result: data.result as TgMessage };
    return { ok: false, code: data?.error_code ?? res.status, description: (data?.description ?? `HTTP ${res.status}`).slice(0, 200) };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    return { ok: false, code: 0, description: timeout ? "Telegram javob bermadi" : "Telegram bilan aloqa yoʻq", timeout };
  }
}

/** Telegram allows ~30 messages a second overall; stay under it for bulk sends. */
export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
