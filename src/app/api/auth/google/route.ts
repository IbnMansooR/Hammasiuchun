import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { googleAuthUrl, googleEnabled } from "@/lib/googleAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!googleEnabled) return new Response("Google login sozlanmagan", { status: 404 });

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 min, just long enough for the redirect round trip
  };
  res.cookies.set("feekr_g_state", state, opts);
  // Started from a Russian page: come back to Russian pages.
  if (req.nextUrl.searchParams.get("lang") === "ru") res.cookies.set("feekr_g_lang", "ru", opts);
  else res.cookies.delete("feekr_g_lang");
  return res;
}
