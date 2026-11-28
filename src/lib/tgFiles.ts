// The file channel (Admin → Telegram, e.g. @feekrfontbase): each posted font's ZIP is kept there, the
// very file the site's download button gives, and channel posts link to it ("Telegramdan yuklab
// olish"). A font is uploaded once and the upload is reused until its files change.
import crypto from "node:crypto";
import { db } from "./db";
import { familyZip } from "./familyZip";
import { CATEGORY_LABEL } from "./fonts";
import { LICENSE_LABEL, PUBLIC_FAMILY } from "./license";
import { esc, sendDocument, siteLink } from "./telegram";
import type { TgChannel } from "./tgState";

const MAX_UPLOAD = 49 * 1024 * 1024; // bots may upload up to 50 MB

/** A public link to a channel message (t.me/c/… for a channel without a username: members only). */
export const messageLink = (ch: TgChannel, messageId: number) =>
  ch.username ? `https://t.me/${ch.username}/${messageId}` : `https://t.me/c/${ch.id.replace(/^-100/, "")}/${messageId}`;

export type FileResult =
  | { ok: true; url: string; uploaded: boolean }
  | { ok: false; reason: "nofile" | "toolarge" | "notadmin" | "send" };

/** The font's file in the file channel: the earlier upload while the files are the same, else a new one. */
export async function fontFile(base: TgChannel, slug: string): Promise<FileResult> {
  const fam = await db.family.findFirst({
    where: { ...PUBLIC_FAMILY, slug },
    select: {
      name: true, styleCount: true, hasLatin: true, hasCyrillic: true, category: true, licenseClass: true,
      styles: { select: { file: true, size: true }, orderBy: { file: "asc" } },
    },
  });
  if (!fam) return { ok: false, reason: "nofile" };
  // What the ZIP is made of; a re-upload of the font (or a rename) makes a new file.
  const version = crypto.createHash("sha1")
    .update([fam.name, fam.licenseClass, ...fam.styles.map((s) => `${s.file}:${s.size}`)].join("|"))
    .digest("hex").slice(0, 12);
  const prev = await db.tgPost.findFirst({ where: { kind: "file", ref: slug, chatId: base.id, caption: { endsWith: `#${version}` } }, orderBy: { postedAt: "desc" } });
  if (prev) return { ok: true, url: messageLink(base, prev.messageId), uploaded: false };

  const zip = await familyZip(slug);
  if (!zip) return { ok: false, reason: "nofile" };
  if (zip.data.length > MAX_UPLOAD) return { ok: false, reason: "toolarge" };
  const scripts = [fam.hasLatin && "Lotin", fam.hasCyrillic && "Kirill"].filter(Boolean).join(" + ");
  const site = siteLink(`/fonts/${slug}`, "channel");
  const caption = [
    `<b>${esc(fam.name)}</b>`,
    esc([`${fam.styleCount} uslub`, scripts, CATEGORY_LABEL[fam.category] ?? fam.category, LICENSE_LABEL[fam.licenseClass] ?? fam.licenseClass].filter(Boolean).join(" · ")),
    `Saytda: <a href="${esc(site)}">feekrfont.uz/fonts/${esc(slug)}</a>`,
  ].join("\n");
  const r = await sendDocument(base.id, zip, caption);
  if (!r.ok) return { ok: false, reason: r.code === 403 || /not enough rights|chat not found|kicked/i.test(r.description) ? "notadmin" : "send" };
  await db.tgPost.create({ data: { kind: "file", ref: slug, chatId: base.id, messageId: r.result.message_id, caption: `${zip.name}#${version}` } });
  return { ok: true, url: messageLink(base, r.result.message_id), uploaded: true };
}
