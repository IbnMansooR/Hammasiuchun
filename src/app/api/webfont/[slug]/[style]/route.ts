import { db } from "@/lib/db";
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
      // "private": browser-cache only. With "public" the Vercel CDN stored the
      // font and served it to anyone, skipping the Sec-Fetch-Site gate below.
      "Cache-Control": "private, max-age=31536000, immutable",
      Vary: "Sec-Fetch-Site",
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; style: string }> },
) {
  // Only serve font loads from our own pages (blocks direct downloads / hotlinks).
  // Fail closed: a MISSING Sec-Fetch-Site header (curl, wget, scripts) is not a
  // browser same-origin request and must not be treated as one.
  const site = req.headers.get("sec-fetch-site");
  if (site !== "same-origin") return new Response("Forbidden", { status: 403 });

  const { slug: rawSlug, style: rawStyle } = await params;
  const slug = rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const style = rawStyle.replace(/[^A-Za-z0-9]/g, "");
  if (!slug || !style) return new Response("Bad request", { status: 400 });

  try {
    // Serve a valid cache hit; ignore truncated files and regenerate.
    const hit = await readWebfont(slug, style);
    if (hit && isWoff2(hit)) return ok(hit);

    const fam = await db.family.findUnique({
      where: { slug },
      select: { folder: true, styles: { where: { style }, take: 1 } },
    });
    const st = fam?.styles?.[0];
    if (!fam || !st) return new Response("Not found", { status: 404 });

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
