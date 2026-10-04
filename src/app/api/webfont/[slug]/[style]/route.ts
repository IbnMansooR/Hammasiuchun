import { db } from "@/lib/db";
import { isRedistributable } from "@/lib/license";
import { readFont, readWebfont, writeWebfont } from "@/lib/storage";
import * as wawoff2 from "wawoff2";

export const runtime = "nodejs";

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

    // Serve a valid cache hit; ignore truncated files and regenerate.
    const hit = await readWebfont(slug, style);
    if (hit && isWoff2(hit)) return ok(hit);

    const raw = await readFont(fam.folder, st.file);
    if (!raw) return new Response("Missing source", { status: 404 });

    const woff2: Uint8Array = st.ext === "woff2" ? raw : await wawoff2.compress(raw);
    const buf = Buffer.from(woff2);
    try { await writeWebfont(slug, style, buf); } catch { /* cache is best-effort */ }
    return ok(buf);
  } catch {
    return new Response("Font error", { status: 500 });
  }
}
