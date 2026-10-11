// Called every 5 minutes by the database's pg_cron (see lib/cronAuth): posts the next font to the
// channel when one of the admin's post times has come (lib/tgAutopost). Cheap when nothing is due.
import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cronAuth";
import { botEnabled } from "@/lib/telegram";
import { runAutopost } from "@/lib/tgAutopost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await cronAuthorized(req))) return new NextResponse(null, { status: 401 });
  if (!botEnabled()) return NextResponse.json({ autopost: null, reason: "bot not configured" });
  const autopost = await runAutopost().catch(() => ({ posted: null, reason: "send" as const }));
  return NextResponse.json({ autopost });
}
