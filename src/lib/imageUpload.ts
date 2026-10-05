// One place for "accept an image upload": used by the admin's uploader and by
// members submitting work. The bytes decide what a file is, never its name or MIME.
import crypto from "node:crypto";
import path from "node:path";
import type { NextRequest } from "next/server";
import { db } from "./db";
import { putUpload } from "./storage";
import { slugify } from "./fontmeta";
import { sniffImageFamily, EXT_FAMILY, imageSize } from "./imagesniff";

// One image per request. The browser downsizes big files first, which keeps every
// request under Vercel's 4.5 MB function body limit.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** The request came from our own pages (the cookies are SameSite=Lax; this is a second lock). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

export type ParsedImage = { buf: Buffer; ext: string; mime: string; name: string; base: string };

export async function parseImage(req: NextRequest): Promise<{ ok: true; image: ParsedImage } | { ok: false; response: Response }> {
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, response: fail("Fayl tanlanmagan.") };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, response: fail("Rasm 4 MB dan katta. Kichikroq fayl tanlang.") };

  const ext = (path.extname(file.name) || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (!EXT_FAMILY[ext] || sniffImageFamily(buf) !== EXT_FAMILY[ext]) {
    return { ok: false, response: fail("Faqat JPG, PNG, GIF, WebP yoki AVIF rasm yuklash mumkin.") };
  }
  const base = slugify(path.basename(file.name, ext)) || "image";
  const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
  return { ok: true, image: { buf, ext, mime: `image/${EXT_FAMILY[ext]}`, name, base } };
}

/** Save to storage and record it in Media (with the uploader, for member uploads). */
export async function storeImage(img: ParsedImage, uploadedBy: number | null = null) {
  const url = await putUpload(img.name, img.buf, img.mime);
  const size = imageSize(img.buf);
  await db.media.create({
    data: {
      filename: img.name, url, mime: img.mime, size: img.buf.length, alt: img.base,
      width: size?.width ?? null, height: size?.height ?? null, uploadedBy,
    },
  });
  return { url, width: size?.width ?? null, height: size?.height ?? null };
}
