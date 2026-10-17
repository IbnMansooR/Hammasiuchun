// Called every 5 minutes by the database's pg_cron (see lib/cronAuth): posts the next font to the
// channel when one of the admin's post times has come (lib/tgAutopost), and once a day sends the
// admins new font suggestions (lib/fontScout). Cheap when nothing is due.
import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cronAuth";
import { botEnabled } from "@/lib/telegram";
import { runAutopost } from "@/lib/tgAutopost";
import { runScout } from "@/lib/fontScout";
import { runChannelAds } from "@/lib/channelAds";
import { runContentScout } from "@/lib/contentScout";
import { runQuizReminders } from "@/lib/tgQuiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await cronAuthorized(req))) return new NextResponse(null, { status: 401 });
  if (!botEnabled()) return NextResponse.json({ autopost: null, reason: "bot not configured" });
  // Paid posts keep their exact time, so they go first.
  const ads = await runChannelAds().catch(() => ({ posted: 0, deleted: 0 }));
  const autopost = await runAutopost().catch(() => ({ posted: null, reason: "send" as const }));
  // Not in the same call as a post: both together could outrun the time limit.
  const scout = autopost.posted ? null : await runScout().catch(() => ({ sent: 0, reason: "error" as const }));
  // Designers and news, at their own time of day and never in a call that already did the heavy work.
  const content = autopost.posted || (scout && "sent" in scout && scout.sent) ? null : await runContentScout().catch(() => ({ news: 0, designers: 0, reason: "error" as const }));
  // A short evening nudge for players whose streak ends today.
  const quiz = await runQuizReminders().catch(() => ({ sent: 0 }));
  return NextResponse.json({ ads, autopost, scout, content, quiz });
}
