// What the bot posts to the channel: a picture, a caption the admin can edit before sending,
// and a button back to the site (tagged utm_source=telegram so the visits show in the statistics).
import { db } from "./db";
import { CATEGORY_LABEL } from "./fonts";
import { LICENSE_LABEL, PUBLIC_FAMILY } from "./license";
import { SITE_URL } from "./site";
import { absoluteImage, esc, siteLink, type Keyboard } from "./telegram";
import { splitTags } from "./works";

export const CAPTION_MAX = 1000; // Telegram's photo caption limit is 1024 characters

export type PostDraft = {
  kind: "font" | "work";
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
