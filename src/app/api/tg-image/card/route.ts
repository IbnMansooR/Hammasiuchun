// The bot's shareable cards (test result, wallpaper, brand wordmark). Only URLs the bot signed are drawn.
import { NextRequest, NextResponse } from "next/server";
import { CARD_TEXT_MAX, renderCard, verifyCard } from "@/lib/playCards";
import { overLimit, tooManyRequests } from "@/lib/softLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (overLimit("card", req.headers, 90, 10 * 60_000)) return tooManyRequests(300);
  const q = req.nextUrl.searchParams;
  const k = q.get("k") ?? "";
  const t = q.get("t") ?? "";
  const f = q.get("f") ?? "";
  const v = q.get("v") ?? "";
  const s = q.get("s") ?? "";
  if (!["test", "wall", "brand", "quiz"].includes(k) || t.length === 0 || t.length > CARD_TEXT_MAX || f.length > 120 || v.length > 12 || !verifyCard(k, t, f, v, s)) {
    return new NextResponse(null, { status: 403 });
  }
  const res = await renderCard(k as "test" | "wall" | "brand" | "quiz", t, f, v);
  return res ?? new NextResponse(null, { status: 404 });
}
