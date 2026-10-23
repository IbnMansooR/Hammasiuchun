// Channel posters (lib/fontPoster): public families and known quotes only, so they can be cached
// like the font's own Open Graph picture.
import { POSTER_KINDS, renderPoster, type PosterKind } from "@/lib/fontPoster";
import { isQuoteId } from "@/lib/quotes";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; kind: string }> }) {
  if (overLimit("poster", req.headers, 200, 10 * 60_000)) return tooManyRequests(300);
  const { slug: raw, kind } = await params;
  const slug = raw.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const q = new URL(req.url).searchParams.get("q");
  if (!slug || !(POSTER_KINDS as readonly string[]).includes(kind) || (q !== null && !isQuoteId(q))) {
    return new Response("Bad request", { status: 400 });
  }
  const png = await renderPoster(slug, kind as PosterKind, q).catch(() => null);
  if (!png) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
