// What the bot posts to the channel: a picture, a caption the admin can edit before sending,
// and a button back to the site (tagged utm_source=telegram so the visits show in the statistics).
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { LICENSE_LABEL, PUBLIC_FAMILY } from "./license";
import { SITE_URL } from "./site";
import { absoluteImage, esc, sendPhotoOrText, siteLink, type Keyboard, type TgMessage } from "./telegram";
import { getTgState } from "./tgState";
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
  caption: string; // plain text; the first line is set in bold when sent
  keyboard: Keyboard;
  backHref: string;
};

const tag = (s: string) => `#${s.toLowerCase().replace(/[^a-z0-9ʻʼа-яёўқғҳ]+/gi, "")}`;

export async function fontDraft(slug: string): Promise<PostDraft | null> {
  const f = await db.family.findFirst({ where: { ...PUBLIC_FAMILY, slug } });
  if (!f) return null;
  const scripts = [f.hasLatin && "Lotin", f.hasCyrillic && "Kirill"].filter(Boolean).join(" + ");
  const lines = [
    f.name,
    f.tagline?.trim() || null,
    "",
    `✦ ${f.styleCount} uslub${scripts ? ` · ${scripts}` : ""} · ${CATEGORY_LABEL[f.category] ?? f.category}`,
    `✦ ${LICENSE_LABEL[f.licenseClass] ?? f.licenseClass} · bepul`,
    f.designer ? `✦ Dizayner: ${f.designer}` : null,
    "",
    ["#shrift", "#bepulshrift", f.hasCyrillic ? "#kirill" : null, tag(CATEGORY_LABEL[f.category] ?? f.category)].filter(Boolean).join(" "),
  ].filter((l) => l !== null);
  return {
    kind: "font",
    ref: f.slug,
    title: f.name,
    image: `${SITE_URL}/api/tg-image/font/${encodeURIComponent(f.slug)}`,
    caption: lines.join("\n"),
    keyboard: [[{ text: "Koʻrish va yuklab olish", url: siteLink(`/fonts/${f.slug}`, "channel") }]],
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

export type PostResult = { ok: true; messageId: number; chatId: string; username: string | null } | { ok: false; reason: "nochannel" | "notadmin" | "send" };

/** Publish a draft (with the admin's caption) to the connected channel and log it. */
export async function postDraft(draft: PostDraft, caption: string, silent = false): Promise<PostResult> {
  const { channel } = await getTgState();
  if (!channel) return { ok: false, reason: "nochannel" };
  const r = await sendPhotoOrText(channel.id, draft.image, captionHtml(caption), draft.keyboard, { disable_notification: silent });
  if (!r.ok) return { ok: false, reason: r.code === 403 || /not enough rights|chat not found|kicked/i.test(r.description) ? "notadmin" : "send" };
  const messageId = (r.result as TgMessage).message_id;
  await db.tgPost.create({ data: { kind: draft.kind, ref: draft.ref, chatId: channel.id, messageId, caption } });
  return { ok: true, messageId, chatId: channel.id, username: channel.username };
}
