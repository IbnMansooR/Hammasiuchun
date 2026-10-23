// The button under a paid channel post (lib/channelAds): counts the click for the advertiser's
// report, then goes on to the advertiser's page. Only the stored link is ever followed.
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { clientIpOf, deviceOf, isBot, visitorId } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const ad = Number.isInteger(id) && id > 0
    ? await db.channelAd.findUnique({ where: { id }, select: { id: true, href: true } }).catch(() => null)
    : null;
  if (!ad?.href) return NextResponse.redirect(SITE_URL, 302);
  const ua = req.headers.get("user-agent") ?? "";
  // Link previews (Telegram fetches the page to draw one) are not clicks.
  if (!isBot(ua)) {
    const visitor = visitorId(clientIpOf(req.headers), ua);
    after(() => db.hit.create({
      data: { name: "tgad_click", path: `/r/${ad.id}`, visitor, source: "telegram", device: deviceOf(ua), meta: String(ad.id) },
    }).catch(() => {}));
  }
  const res = NextResponse.redirect(ad.href, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  return res;
}
