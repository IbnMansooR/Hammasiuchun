// What the bot posts to the channel: a picture, a caption the admin can edit before sending,
// and a way back to the site (tagged utm_source=telegram so the visits show in the statistics).
// Font posts end with links like the channel's own posts: the site, the file in the file channel
// (lib/tgFiles), feekrfont.uz and Instagram.
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { LICENSE_LABEL, PUBLIC_FAMILY } from "./license";
import { SITE_URL } from "./site";
import { absoluteImage, esc, sendAlbum, sendPhotoOrText, siteLink, type Keyboard, type TgMessage } from "./telegram";
import { posterAlbum } from "./fontPoster";
import { getTgState, updateTgState } from "./tgState";
import { fontFile } from "./tgFiles";
import { getSiteSettings } from "./settings";
import { rememberQuote } from "./quotes";
import { splitTags } from "./works";
import { TZ_OFFSET_MS, tashkentDay } from "./analytics";
import { formatDate } from "./format";
import { sampleFonts, sampleImageUrl } from "./fontSamples";

export const CAPTION_MAX = 1000; // Telegram's photo caption limit is 1024 characters

export type PostDraft = {
  kind: "font" | "work" | "digest";
  ref: string;
  title: string;
  image: string | null;
  /** Font posts: the specimen posters, sent as one album instead of `image` + buttons. */
  album?: string[] | null;
  /** The quote the album leads with (lib/quotes), remembered once posted so the next one differs. */
  quote?: string | null;
  caption: string; // plain text; the first line is set in bold when sent
  keyboard: Keyboard;
  /** Font posts: the font page, for "Saytdan yuklab olish" in the links under the caption. */
  site?: string;
  backHref: string;
};

/** The admin's tagline as a bold title and a lead: its first sentence names the font (or the
 * name is put in front), the rest becomes the next paragraph. */
function titleAndLead(name: string, tagline: string | null): { title: string; lead: string | null } {
  const t = (tagline ?? "").replace(/\s+/g, " ").trim();
  if (!t) return { title: `${name} shrifti`, lead: null };
  const [first, ...rest] = t.split(/(?<=[.!?])\s+(?=\p{Lu})/u);
  const word = name.split(/[\s_-]+/)[0].toLowerCase();
  return { title: first.toLowerCase().includes(word) ? first : `${name} shrifti – ${first}`, lead: rest.join(" ") || null };
}

/** Plain text from the admin's description (Markdown marks dropped), cut at a sentence. */
function shortText(s: string | null, max: number): string | null {
  const t = (s ?? "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max / 2 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}

/** `quote`: the admin's pick for the first poster (otherwise one that suits the font is chosen). */
export async function fontDraft(slug: string, quote?: string | null): Promise<PostDraft | null> {
  const f = await db.family.findFirst({ where: { ...PUBLIC_FAMILY, slug } });
  if (!f) return null;
  const album = await posterAlbum(f.slug, quote);
  const scripts = [f.hasLatin && "Lotin", f.hasCyrillic && "Kirill"].filter(Boolean).join(" + ");
  const { title, lead } = titleAndLead(f.name, f.tagline);
  const facts = [
    `✦ ${[`${f.styleCount} uslub`, scripts, CATEGORY_LABEL[f.category] ?? f.category, `${LICENSE_LABEL[f.licenseClass] ?? f.licenseClass} · bepul`].filter(Boolean).join(" · ")}`,
    f.designer ? `✦ Dizayner: ${f.designer}` : null,
  ].filter(Boolean).join("\n");
  return {
    kind: "font",
    ref: f.slug,
    title: f.name,
    image: `${SITE_URL}/api/tg-image/font/${encodeURIComponent(f.slug)}`,
    album: album?.urls ?? null,
    quote: album?.quote ?? null,
    caption: [title, lead, shortText(f.description, 520), facts].filter(Boolean).join("\n\n"),
    keyboard: [],
    site: siteLink(`/fonts/${f.slug}`, "channel"),
    backHref: `/admin/fonts/${f.slug}`,
  };
}

export async function workDraft(id: number): Promise<PostDraft | null> {
  const w = await db.work.findFirst({ where: { id, isPublished: true, status: "approved" } });
  if (!w) return null;
  const slugs = splitTags(w.fonts);
  const fonts = slugs.length
    ? await db.family.findMany({ where: { ...PUBLIC_FAMILY, slug: { in: slugs } }, select: { name: true } })
    : [];
  const lines = [
    w.title,
    w.summary?.trim() || null,
    "",
    w.authorName ? `Muallif: ${w.authorName}` : null,
    fonts.length ? `Shriftlar: ${fonts.map((f) => f.name).join(", ")}` : null,
    "",
    "Siz ham ishingizni yuboring: feekrfont.uz/dizaynerlar/yuborish",
    "#dizayn #feekr",
  ].filter((l) => l !== null);
  const keyboard: Keyboard = [[{ text: "Ishni koʻrish", url: siteLink(`/dizaynerlar/${w.slug}`, "channel") }]];
  if (w.authorUrl && /^https:\/\//.test(w.authorUrl)) keyboard.push([{ text: "Muallif portfoliosi", url: w.authorUrl }]);
  return {
    kind: "work",
    ref: String(w.id),
    title: w.title,
    image: absoluteImage(w.coverImage),
    caption: lines.join("\n").replace(/\n{3,}/g, "\n\n"),
    keyboard,
    backHref: "/admin/works",
  };
}

/** Plain caption → Telegram HTML: everything escaped, first line bold. */
export function captionHtml(plain: string): string {
  const [first, ...rest] = plain.replace(/\r\n/g, "\n").trim().split("\n");
  return [`<b>${esc(first)}</b>`, ...rest.map(esc)].join("\n");
}

/* ---------------- weekly digest ---------------- */

const DAY = 24 * 60 * 60 * 1000;
const shortDate = (d: Date) => formatDate(new Date(d.getTime() + TZ_OFFSET_MS)).replace(/, \d{4}$/, "");

/** The last seven days: most downloaded fonts (topped up with all-time favourites when the
 * week was quiet), new fonts and new works. ref = the Tashkent date it was made for. */
export async function digestDraft(now = new Date()): Promise<PostDraft | null> {
  const since = new Date(now.getTime() - 7 * DAY);
  const week = await db.$queryRaw<{ slug: string; n: number }[]>`
    SELECT meta AS slug, COUNT(*)::int AS n FROM "Hit"
    WHERE "at" >= ${since} AND name = 'download' AND meta IS NOT NULL GROUP BY meta ORDER BY n DESC LIMIT 20`;
  const pub = await db.family.findMany({
    where: PUBLIC_FAMILY,
    orderBy: [{ downloads: "desc" }, { name: "asc" }],
    select: { slug: true, name: true, createdAt: true },
  });
  if (pub.length === 0) return null;
  const bySlug = new Map(pub.map((f) => [f.slug, f]));
  const top: { slug: string; name: string; n: number }[] = [];
  for (const w of week) {
    const f = bySlug.get(w.slug);
    if (f && top.length < 5) top.push({ slug: f.slug, name: f.name, n: w.n });
  }
  for (const f of pub) {
    if (top.length >= 5) break;
    if (!top.some((t) => t.slug === f.slug)) top.push({ slug: f.slug, name: f.name, n: 0 });
  }
  const fresh = pub.filter((f) => f.createdAt >= since).slice(0, 3);
  const works = await db.work.findMany({
    where: { isPublished: true, status: "approved", publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { title: true },
  });

  const lines = [
    `Haftaning shriftlari · ${shortDate(since)} – ${shortDate(now)}`,
    "",
    ...top.map((t, i) => `${i + 1}. ${t.name}${t.n ? ` · ${t.n} marta yuklandi` : ""}`),
  ];
  if (fresh.length) lines.push("", `Yangi: ${fresh.map((f) => f.name).join(", ")}`);
  if (works.length) lines.push("", `Dizaynerlar boʻlimida: ${works.map((w) => `“${w.title}”`).join(", ")}`);
  lines.push("", "Hammasi bepul: feekrfont.uz", "#haftalik #shrift #bepulshrift");

  // The picture: each font's name set in that font (only fonts the renderer can draw).
  const drawable = new Set((await sampleFonts()).map((f) => f.slug));
  const pictured = top.filter((t) => drawable.has(t.slug)).slice(0, 4).map((t) => t.slug);
  const keyboard: Keyboard = top.slice(0, 4).map((t, i) => [{ text: `${i + 1}. ${t.name}`, url: siteLink(`/fonts/${t.slug}`, "channel") }]);
  keyboard.push([{ text: "Barcha shriftlar", url: siteLink("/fonts", "channel") }]);
  return {
    kind: "digest",
    ref: tashkentDay(now),
    title: "Haftalik dayjest",
    image: pictured.length ? sampleImageUrl("names", "", pictured) : null,
    caption: lines.join("\n"),
    keyboard,
    backHref: "/admin/telegram",
  };
}

/* ---------------- sending ---------------- */

export type PostResult =
  | { ok: true; messageId: number; chatId: string; username: string | null }
  | { ok: false; reason: "nochannel" | "notadmin" | "send" | "unsure" | "basefile" };

/** Telegram counts a caption's length without the markup. */
export const visibleLength = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, "_").length;

/** The caption with a fixed tail (the links): Telegram's limit is 1024 characters, so the text is
 * shortened when needed, never the links. */
export function captionWithTail(plain: string, tail: string): string {
  let text = plain.trim();
  while (text.length > 0 && visibleLength(captionHtml(text)) + visibleLength(tail) > 1024) text = `${text.slice(0, -40).trimEnd()}…`;
  return captionHtml(text) + tail;
}

/** The links under a font post. `file` is the post in the file channel (none when not connected). */
export function fontLinksHtml(site: string, file: string | null, instagram: string | null): string {
  return [
    "",
    "",
    `Saytdan yuklab olish: <a href="${esc(site)}">bu yerda</a>`,
    file ? `Telegramdan <a href="${esc(file)}">yuklab olish</a>` : null,
    "",
    `🔗 <a href="${esc(siteLink("/", "channel"))}">feekrfont.uz</a>`,
    instagram ? `📱 <a href="${esc(instagram)}">Instagram</a>` : null,
  ].filter((l) => l !== null).join("\n");
}

/** Publish a draft (with the admin's caption) to the connected channel and log it. A font's file
 * goes to the file channel first, so the post can link to it. */
export async function postDraft(draft: PostDraft, caption: string, silent = false): Promise<PostResult> {
  const { channel, base } = await getTgState();
  if (!channel) return { ok: false, reason: "nochannel" };
  const extra = { disable_notification: silent };
  const notAdmin = (d: string, code: number) => code === 403 || /not enough rights|chat not found|kicked/i.test(d);
  let html = captionHtml(caption);
  if (draft.kind === "font" && draft.site) {
    let file: string | null = null;
    if (base) {
      const f = await fontFile(base, draft.ref);
      if (f.ok) file = f.url;
      // A file too big for Telegram (or missing) only drops that one link; a failed upload stops
      // the post, so it never goes out without the link it should have.
      else if (f.reason === "notadmin" || f.reason === "send") return { ok: false, reason: "basefile" };
    }
    const { socials } = await getSiteSettings();
    const ig = socials.find((x) => x.key === "instagram" && x.enabled && /^https:\/\//.test(x.url))?.url ?? null;
    html = captionWithTail(caption, fontLinksHtml(draft.site, file, ig));
  }
  let messageId: number | null = null;
  if (draft.album && draft.album.length >= 2) {
    const a = await sendAlbum(channel.id, draft.album, html, extra);
    if (a.ok) {
      messageId = a.result[0]?.message_id ?? null;
      const q = draft.quote;
      if (q) await updateTgState((s) => rememberQuote(s.quotes, q)).catch(() => null);
    }
    else if (notAdmin(a.description, a.code)) return { ok: false, reason: "notadmin" };
    // Telegram refused it (a picture it couldn't fetch): fall back to the single card. Not on a
    // timeout: the album may still have gone out ("unsure"), and a second post would be a duplicate.
    else if (a.code !== 400) return { ok: false, reason: a.timeout ? "unsure" : "send" };
  }
  if (messageId === null) {
    const r = await sendPhotoOrText(channel.id, draft.image, html, draft.keyboard.length ? draft.keyboard : undefined, extra);
    if (!r.ok) return { ok: false, reason: notAdmin(r.description, r.code) ? "notadmin" : "send" };
    messageId = (r.result as TgMessage).message_id;
  }
  await db.tgPost.create({ data: { kind: draft.kind, ref: draft.ref, chatId: channel.id, messageId, caption } });
  return { ok: true, messageId, chatId: channel.id, username: channel.username };
}
