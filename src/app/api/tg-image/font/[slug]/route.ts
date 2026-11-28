// The font's Open Graph card at a stable address for Telegram posts (the page's own
// og:image URL carries a build hash). Same picture, same caching.
import Image from "@/app/(site)/fonts/[slug]/opengraph-image";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  // Telegram fetches each picture once and caches it; this only trips on scripts.
  if (overLimit("tgimg", req.headers, 300, 10 * 60_000)) return tooManyRequests(300);
  return Image({ params: ctx.params });
}
