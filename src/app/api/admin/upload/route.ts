import { NextRequest } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { putUpload } from "@/lib/storage";
import { slugify } from "@/lib/fontmeta";
import { sniffImageFamily, EXT_FAMILY, imageSize } from "@/lib/imagesniff";

export const runtime = "nodejs";

// One image per request. The browser downsizes big files before sending, which
// keeps every request under Vercel's 4.5 MB function body limit.
const MAX_BYTES = 4 * 1024 * 1024;

const fail = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: NextRequest) {
  if (!(await getSession())) return fail("Avval admin sifatida kiring.", 401);
  // The admin cookie is SameSite=Lax, but check the origin as well.
  const origin = req.headers.get("origin");
  if (origin) {
    let same = false;
    try { same = new URL(origin).host === req.headers.get("host"); } catch { /* "null" or garbage */ }
    if (!same) return fail("Notoʻgʻri manba.", 403);
  }

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Fayl tanlanmagan.");
  if (file.size > MAX_BYTES) return fail("Rasm 4 MB dan katta. Kichikroq fayl tanlang.");

  const ext = (path.extname(file.name) || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  // Trust the bytes, not the name or the declared MIME type.
  if (!EXT_FAMILY[ext] || sniffImageFamily(buf) !== EXT_FAMILY[ext]) {
    return fail("Faqat JPG, PNG, GIF, WebP yoki AVIF rasm yuklash mumkin.");
  }
  const mime = `image/${EXT_FAMILY[ext]}`;
  const base = slugify(path.basename(file.name, ext)) || "image";
  const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
  const url = await putUpload(name, buf, mime);
  const size = imageSize(buf);
  await db.media.create({
    data: { filename: name, url, mime, size: buf.length, alt: base, width: size?.width ?? null, height: size?.height ?? null },
  });
  return Response.json({ url, width: size?.width ?? null, height: size?.height ?? null });
}
