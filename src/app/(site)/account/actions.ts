"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { startUserSession, destroyUserSession, verifyUserPassword, isValidEmail, blockedLoginUrl, getCurrentUser } from "@/lib/userAuth";
import { sendSms, normalizePhone, smsEnabled } from "@/lib/eskiz";
import { clientIp, isLocked, hit, clear } from "@/lib/rateLimit";
import { mailEnabled, sendMail } from "@/lib/mailer";
import { signResetToken, verifyResetToken } from "@/lib/resetToken";
import { SITE_URL } from "@/lib/site";
import { formatDate } from "@/lib/format";
import { recordServerHit } from "@/lib/analytics";
import { botEnabled, botUsername, sendMessage } from "@/lib/telegram";
import { LINK_TTL_MS, linkCode } from "@/lib/tgState";
import { getLocale, getT, lhref } from "@/i18n/server";

// Actions run on the page's own request, so they redirect back into the visitor's language.
const go = async (path: string): Promise<never> => redirect(await lhref(path));

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function registerAction(fd: FormData) {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");

  // At most 10 registration attempts per IP per hour (spam / enumeration).
  const rk = `reg:${await clientIp()}`;
  if (await isLocked(rk)) await go("/register?error=locked");
  await hit(rk, 10, 60 * 60 * 1000);

  if (!isValidEmail(email)) await go("/register?error=email");
  if (password.length < 8) await go("/register?error=password");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) await go("/register?error=exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash, name: name || null },
  });
  await recordServerHit("signup", "email", "/register");
  await startUserSession(user.id);
  await go("/account");
}

export async function userLoginAction(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");

  // Same lockout policy as the admin login: 8 failures → 15 minutes.
  const lk = `ulogin:${await clientIp()}`;
  if (await isLocked(lk)) await go("/login?error=locked");

  const userId = await verifyUserPassword(email, password);
  if (!userId) {
    await hit(lk, 8, 15 * 60 * 1000);
    return go("/login?error=1");
  }

  await clear(lk);
  const blocked = await startUserSession(userId);
  if (blocked) await go(blockedLoginUrl(blocked));
  await go("/account");
}

export async function userLogoutAction() {
  await destroyUserSession();
  revalidatePath("/", "layout");
  await go("/");
}

/* ---------------- phone + SMS code login ---------------- */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_FAILS = 5;

export async function sendPhoneOtpAction(rawPhone: string): Promise<{ ok: boolean; error?: string }> {
  const t = (await getT()).auth;
  if (!smsEnabled) return { ok: false, error: t.smsOff };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: t.badPhoneEx };

  // Per-IP cap on top of the per-phone cooldown, so nobody can pump SMS to many numbers.
  const sk = `otpsend:${await clientIp()}`;
  if (await isLocked(sk)) return { ok: false, error: t.tooMany };
  await hit(sk, 10, 60 * 60 * 1000);

  const last = await db.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, error: t.codeSent };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  await db.phoneOtp.create({ data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {}); // fresh code, fresh attempts
  const sent = await sendSms(phone, `Feekr tasdiqlash kodi: ${code}`);
  if (!sent) return { ok: false, error: t.smsFailed };
  return { ok: true };
}

export async function verifyPhoneOtpAction(rawPhone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const locale = await getLocale();
  const t = (await getT()).auth;
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: t.badPhone };

  const otp = await db.phoneOtp.findFirst({
    where: { phone, code: code.trim(), consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    // A 6-digit code is brute-forceable without a cap: after OTP_MAX_FAILS wrong
    // guesses, burn every outstanding code for this phone so a new one is needed.
    const key = `otp:${phone}`;
    const a = await db.loginAttempt.upsert({
      where: { key },
      update: { count: { increment: 1 } },
      create: { key, count: 1 },
    });
    if (a.count >= OTP_MAX_FAILS) {
      await db.phoneOtp.updateMany({ where: { phone, consumed: false }, data: { consumed: true } });
      await db.loginAttempt.delete({ where: { key } }).catch(() => {});
      return { ok: false, error: t.tooManyCode };
    }
    return { ok: false, error: t.badCode };
  }

  await db.phoneOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {});
  let user = await db.user.findUnique({ where: { phone } });
  if (!user) {
    user = await db.user.create({ data: { phone } });
    await recordServerHit("signup", "phone", "/login");
  }

  const blocked = await startUserSession(user.id);
  if (blocked) {
    return {
      ok: false,
      error: blocked.until ? t.restrictedUntil(formatDate(blocked.until, locale)) : t.blockedContact,
    };
  }
  return { ok: true };
}

/* ---------------- password reset (email link) ---------------- */
export async function requestPasswordResetAction(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const fk = `forgot:${await clientIp()}`;
  if (await isLocked(fk)) await go("/forgot?error=locked");
  await hit(fk, 5, 60 * 60 * 1000);

  // Same answer whether or not the account exists (no email enumeration).
  if (mailEnabled && isValidEmail(email)) {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (user) {
      const token = await signResetToken(user.id, user.passwordHash);
      const link = `${SITE_URL}${await lhref("/reset")}?token=${encodeURIComponent(token)}`;
      const m = (await getT()).auth.resetMail;
      await sendMail(
        email,
        m.subject,
        `<p>${m.hello}</p><p>${m.text}</p>` +
          `<p><a href="${link}">${m.link}</a></p>` +
          `<p>${m.ignore}</p>`,
      );
    }
  }
  await go("/forgot?sent=1");
}

export async function resetPasswordAction(fd: FormData) {
  const token = str(fd, "token");
  const password = str(fd, "password");
  if (password.length < 8) await go(`/reset?token=${encodeURIComponent(token)}&error=password`);

  const uid = await verifyResetToken(token, (id) => db.user.findUnique({ where: { id }, select: { passwordHash: true } }));
  if (!uid) return go("/reset?error=invalid");

  await db.user.update({ where: { id: uid }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  const blocked = await startUserSession(uid);
  if (blocked) await go(blockedLoginUrl(blocked));
  await go("/account");
}


/* ---------------- preferences ---------------- */
export async function setNotifyNewsAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return go("/login");
  await db.user.update({ where: { id: user.id }, data: { notifyNews: fd.get("news") === "on" } });
  revalidatePath("/account");
  await go("/account?saved=news");
}

/* ---------------- Telegram ---------------- */
/** One-time deep link: pressing Start in the bot attaches this Telegram to the signed-in account. */
export async function connectTelegramAction() {
  const user = await getCurrentUser();
  if (!user) return go("/login");
  if (!botEnabled()) await go("/account");
  const code = linkCode();
  await db.user.update({ where: { id: user.id }, data: { tgLinkCode: code, tgLinkExp: new Date(Date.now() + LINK_TTL_MS) } });
  redirect(`https://t.me/${botUsername()}?start=l_${code}`);
}

export async function setTgNotifyAction(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return go("/login");
  const row = await db.user.findUnique({ where: { id: user.id }, select: { telegramId: true } });
  if (!row?.telegramId) return go("/account");
  if (fd.get("on") === "1") {
    // Telegram only lets a bot write to someone who has opened it; a test message tells us.
    const r = await sendMessage(row.telegramId, "✅ Telegram xabarlari yoqildi. Oʻchirish: /stop");
    if (!r.ok) await go("/account?tg=start");
    await db.user.update({ where: { id: user.id }, data: { tgNotify: true } });
  } else {
    await db.user.update({ where: { id: user.id }, data: { tgNotify: false } });
  }
  revalidatePath("/account");
  await go("/account?saved=tg");
}
