import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exchangeGoogleCode, googleEnabled } from "@/lib/googleAuth";
import { startUserSession, blockedLoginUrl } from "@/lib/userAuth";
import { recordServerHit } from "@/lib/analytics";
import { withLocale } from "@/i18n/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!googleEnabled) return new Response("Google login sozlanmagan", { status: 404 });

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("feekr_g_state")?.value;
  const to = (path: string) => new URL(withLocale(req.cookies.get("feekr_g_lang")?.value === "ru" ? "ru" : "uz", path), req.url);

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(to("/login?error=google"));
  }

  const profile = await exchangeGoogleCode(code);
  if (!profile) return NextResponse.redirect(to("/login?error=google"));

  // Link by googleId first; fall back to linking an existing email/password
  // account so someone who registered with email doesn't end up with two
  // separate accounts if they later use "Continue with Google".
  let user = await db.user.findUnique({ where: { googleId: profile.googleId } });
  // Only trust the email for linking when Google says it is verified —
  // otherwise anyone could claim an existing user's address.
  if (!user && profile.email && profile.emailVerified) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    user = byEmail
      ? await db.user.update({ where: { id: byEmail.id }, data: { googleId: profile.googleId } })
      : null;
  }
  if (!user) {
    user = await db.user.create({
      // An unverified address is not stored (it could also collide with the
      // unique email of an existing account).
      data: { googleId: profile.googleId, email: profile.emailVerified ? profile.email : null, name: profile.name },
    });
    await recordServerHit("signup", "google", "/login");
  }

  const blocked = await startUserSession(user.id);
  const res = NextResponse.redirect(to(blocked ? blockedLoginUrl(blocked) : "/account"));
  res.cookies.delete("feekr_g_state");
  res.cookies.delete("feekr_g_lang");
  return res;
}
