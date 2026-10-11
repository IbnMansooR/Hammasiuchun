// The font's Open Graph card at a stable address for Telegram posts (the page's own
// og:image URL carries a build hash). Same picture, same caching.
import Image from "@/app/(site)/fonts/[slug]/opengraph-image";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  return Image({ params: ctx.params });
}
