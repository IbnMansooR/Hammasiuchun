import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { telegramEnabled, verifyTelegramLogin } from "@/lib/telegramAuth";
import { startUserSession, blockedLoginUrl } from "@/lib/userAuth";
import { recordServerHit } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!telegramEnabled) return new Response("Telegram login sozlanmagan", { status: 404 });
  const fail = () => NextResponse.redirect(new URL("/login?error=telegram", req.url));

  // Nothing touches the database until Telegram's signature checks out.
  const profile = verifyTelegramLogin(req.nextUrl.searchParams);
  if (!profile) return fail();

  let user = await db.user.findUnique({ where: { telegramId: profile.id } });
  let created = false;
  if (!user) {
    user = await db.user.create({ data: { telegramId: profile.id, telegramUsername: profile.username, name: profile.name } });
    created = true;
  } else if (profile.username !== user.telegramUsername) {
    user = await db.user.update({ where: { id: user.id }, data: { telegramUsername: profile.username } });
  }

  const blocked = await startUserSession(user.id);
  if (blocked) return NextResponse.redirect(new URL(blockedLoginUrl(blocked), req.url));
  if (created) await recordServerHit("signup", "telegram", "/login");
  return NextResponse.redirect(new URL("/account", req.url));
}
