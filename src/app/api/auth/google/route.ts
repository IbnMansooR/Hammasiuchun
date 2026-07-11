import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { googleAuthUrl, googleEnabled } from "@/lib/googleAuth";

export const runtime = "nodejs";

export async function GET() {
  if (!googleEnabled) return new Response("Google login sozlanmagan", { status: 404 });

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("feekr_g_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 min, just long enough for the redirect round trip
  });
  return res;
}
