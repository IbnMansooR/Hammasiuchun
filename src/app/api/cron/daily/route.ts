// Vercel Cron (vercel.json) calls this once a day at 04:00 UTC = 09:00 Tashkent.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else is refused.
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { botEnabled } from "@/lib/telegram";
import { sendDailyReport } from "@/lib/tgAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && given.length === want.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(want));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return new NextResponse(null, { status: 401 });
  if (!botEnabled()) return NextResponse.json({ sent: 0, reason: "bot not configured" });
  return NextResponse.json(await sendDailyReport());
}
