import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { telegramEnabled, verifyTelegramLogin } from "@/lib/telegramAuth";
import { startUserSession, blockedLoginUrl } from "@/lib/userAuth";
import { recordServerHit } from "@/lib/analytics";
import { withLocale } from "@/i18n/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!telegramEnabled) return new Response("Telegram login sozlanmagan", { status: 404 });
  // ?lang=ru is ours (the widget on a Russian page adds it); it is not part of what Telegram signed.
  const params = new URLSearchParams(req.nextUrl.searchParams);
  const locale = params.get("lang") === "ru" ? "ru" : "uz";
  params.delete("lang");
  const to = (path: string) => new URL(withLocale(locale, path), req.url);
  const fail = () => NextResponse.redirect(to("/login?error=telegram"));

  // Nothing touches the database until Telegram's signature checks out.
  const profile = verifyTelegramLogin(params);
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
  if (blocked) return NextResponse.redirect(to(blockedLoginUrl(blocked)));
  if (created) await recordServerHit("signup", "telegram", "/login");
  return NextResponse.redirect(to("/account"));
}
