import { db } from "@/lib/db";
import { isRedistributable } from "@/lib/license";
import { readFont, readWebfont, writeWebfont } from "@/lib/storage";
import * as wawoff2 from "wawoff2";
import subsetFont from "subset-font";

export const runtime = "nodejs";

// Families this big are CJK / pan-Unicode fonts (Noto Sans JP is ~16 MB). A
// specimen on this site only ever needs Latin, Uzbek and Cyrillic, so those are
// served as a subset: ~100 KB instead of 3–6 MB, and seconds instead of a 40 s
// first-time conversion.
const SUBSET_OVER = 1_500_000;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join("");
const PREVIEW_CHARS =
  range(0x20, 0x7e) + range(0xa0, 0x17f) + range(0x400, 0x4ff) + range(0x2010, 0x203a) + "ʻʼ€₽№™←↑→↓−×÷";

// WOFF2 files start with the signature "wOF2".
function isWoff2(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "wOF2";
}

function ok(buf: Buffer) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "font/woff2",
      // Only free, redistributable families reach this point, so the CDN may
      // cache them. s-maxage keeps an unpublished family from lingering >1 day.
      "Cache-Control": "public, max-age=604800, s-maxage=86400",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; style: string }> },
) {
  const { slug: rawSlug, style: rawStyle } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const style = rawStyle.replace(/[^A-Za-z0-9]/g, "");
  if (!slug || !style) return new Response("Bad request", { status: 400 });

  try {
    // Check the family first: unpublished or restricted-licence fonts are never
    // served, not even from the webfont cache.
    const fam = await db.family.findUnique({
      where: { slug },
      select: { folder: true, isPublished: true, licenseClass: true, styles: { where: { style }, take: 1 } },
    });
    const st = fam?.styles?.[0];
    if (!fam || !st || !fam.isPublished || !isRedistributable(fam.licenseClass)) {
      return new Response("Not found", { status: 404 });
    }

    // Serve a valid cache hit; ignore truncated files and regenerate. An
    // oversized hit is a full CJK font cached before subsetting existed —
    // rebuild it as a subset (this also overwrites the cache).
    const hit = await readWebfont(slug, style);
    if (hit && isWoff2(hit) && hit.length <= SUBSET_OVER) return ok(hit);

    const raw = await readFont(fam.folder, st.file);
    if (!raw) return new Response("Missing source", { status: 404 });

    let woff2: Uint8Array;
    if (raw.length > SUBSET_OVER) {
      woff2 = await subsetFont(raw, PREVIEW_CHARS, { targetFormat: "woff2" });
    } else {
      woff2 = st.ext === "woff2" ? raw : await wawoff2.compress(raw);
    }
    const buf = Buffer.from(woff2);
    try { await writeWebfont(slug, style, buf); } catch { /* cache is best-effort */ }
    return ok(buf);
  } catch {
    return new Response("Font error", { status: 500 });
  }
}
