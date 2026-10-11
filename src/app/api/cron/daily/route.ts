// Vercel Cron (vercel.json) calls this once a day at 04:00 UTC = 09:00 Tashkent.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { botEnabled } from "@/lib/telegram";
import { sendDailyReport, sendDigestDraft } from "@/lib/tgAdmin";
import { sampleFonts } from "@/lib/fontSamples";
import { TZ_OFFSET_MS } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse(null, { status: 401 });
  if (!botEnabled()) return NextResponse.json({ sent: 0, reason: "bot not configured" });
  const report = await sendDailyReport();
  // Fridays (Tashkent): the weekly digest draft, for the admin to publish with one press.
  const friday = new Date(Date.now() + TZ_OFFSET_MS).getUTCDay() === 5 || req.nextUrl.searchParams.get("digest") === "1";
  const digest = friday ? await sendDigestDraft() : null;
  // Keep the bot's font list warm so the first sample of the day is quick.
  const fonts = (await sampleFonts().catch(() => [])).length;
  return NextResponse.json({ ...report, digest, fonts });
}
