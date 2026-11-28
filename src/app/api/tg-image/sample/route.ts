// The bot's sample picture: the text (or each font's own name) set in up to four fonts.
// Only URLs the bot signed are rendered.
import { NextRequest, NextResponse } from "next/server";
import { MAX_TEXT, renderSample, verifySample } from "@/lib/fontSamples";

export const runtime = "nodejs";
export const maxDuration = 60; // the first call of the day also builds the font list

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const m = q.get("m") ?? "";
  const t = q.get("t") ?? "";
  const f = q.get("f") ?? "";
  const s = q.get("s") ?? "";
  if ((m !== "text" && m !== "names") || t.length > MAX_TEXT || f.length > 400 || !verifySample(m, t, f, s)) {
    return new NextResponse(null, { status: 403 });
  }
  const res = await renderSample(m, t, f.split(",").filter(Boolean));
  return res ?? new NextResponse(null, { status: 404 });
}
