"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUserSession, destroyUserSession, verifyUserPassword, isValidEmail } from "@/lib/userAuth";
import { sendSms, normalizePhone, smsEnabled } from "@/lib/eskiz";
import { clientIp, isLocked, hit, clear } from "@/lib/rateLimit";
import { mailEnabled, sendMail } from "@/lib/mailer";
import { signResetToken, verifyResetToken } from "@/lib/resetToken";
import { SITE_URL } from "@/lib/site";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function registerAction(fd: FormData) {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");

  // At most 10 registration attempts per IP per hour (spam / enumeration).
  const rk = `reg:${await clientIp()}`;
  if (await isLocked(rk)) redirect("/register?error=locked");
  await hit(rk, 10, 60 * 60 * 1000);

  if (!isValidEmail(email)) redirect("/register?error=email");
  if (password.length < 8) redirect("/register?error=password");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) redirect("/register?error=exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: { email, passwordHash, name: name || null },
  });
  await createUserSession(user.id);
  redirect("/account");
}

export async function userLoginAction(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");

  // Same lockout policy as the admin login: 8 failures → 15 minutes.
  const lk = `ulogin:${await clientIp()}`;
  if (await isLocked(lk)) redirect("/login?error=locked");

  const userId = await verifyUserPassword(email, password);
  if (!userId) {
    await hit(lk, 8, 15 * 60 * 1000);
    redirect("/login?error=1");
  }

  await clear(lk);
  await createUserSession(userId);
  redirect("/account");
}

export async function userLogoutAction() {
  await destroyUserSession();
  revalidatePath("/", "layout");
  redirect("/");
}

/* ---------------- phone + SMS code login ---------------- */
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_FAILS = 5;

export async function sendPhoneOtpAction(rawPhone: string): Promise<{ ok: boolean; error?: string }> {
  if (!smsEnabled) return { ok: false, error: "SMS orqali kirish hozircha sozlanmagan." };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "Telefon raqamini toʻgʻri kiriting (masalan 998901234567)." };

  // Per-IP cap on top of the per-phone cooldown, so nobody can pump SMS to many numbers.
  const sk = `otpsend:${await clientIp()}`;
  if (await isLocked(sk)) return { ok: false, error: "Juda koʻp soʻrov. Birozdan soʻng qayta urinib koʻring." };
  await hit(sk, 10, 60 * 60 * 1000);

  const last = await db.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Kod yuborildi, birozdan soʻng qayta urinib koʻring." };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  await db.phoneOtp.create({ data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {}); // fresh code, fresh attempts
  const sent = await sendSms(phone, `Feekr tasdiqlash kodi: ${code}`);
  if (!sent) return { ok: false, error: "SMS yuborilmadi. Birozdan soʻng qayta urinib koʻring." };
  return { ok: true };
}

export async function verifyPhoneOtpAction(rawPhone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "Telefon raqamini toʻgʻri kiriting." };

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
      return { ok: false, error: "Juda koʻp notoʻgʻri urinish. Yangi kod soʻrang." };
    }
    return { ok: false, error: "Kod notoʻgʻri yoki muddati oʻtgan." };
  }

  await db.phoneOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {});
  let user = await db.user.findUnique({ where: { phone } });
  if (!user) user = await db.user.create({ data: { phone } });

  await createUserSession(user.id);
  return { ok: true };
}

/* ---------------- password reset (email link) ---------------- */
export async function requestPasswordResetAction(fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const fk = `forgot:${await clientIp()}`;
  if (await isLocked(fk)) redirect("/forgot?error=locked");
  await hit(fk, 5, 60 * 60 * 1000);

  // Same answer whether or not the account exists (no email enumeration).
  if (mailEnabled && isValidEmail(email)) {
    const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (user) {
      const token = await signResetToken(user.id, user.passwordHash);
      const link = `${SITE_URL}/reset?token=${encodeURIComponent(token)}`;
      await sendMail(
        email,
        "Feekr — parolni tiklash",
        `<p>Salom!</p><p>Feekr hisobingiz parolini tiklash uchun quyidagi havolani bosing (30 daqiqa amal qiladi):</p>` +
          `<p><a href="${link}">Yangi parol oʻrnatish</a></p>` +
          `<p>Agar buni siz soʻramagan boʻlsangiz, bu xatni eʼtiborsiz qoldiring.</p>`,
      );
    }
  }
  redirect("/forgot?sent=1");
}

export async function resetPasswordAction(fd: FormData) {
  const token = str(fd, "token");
  const password = str(fd, "password");
  if (password.length < 8) redirect(`/reset?token=${encodeURIComponent(token)}&error=password`);

  const uid = await verifyResetToken(token, (id) => db.user.findUnique({ where: { id }, select: { passwordHash: true } }));
  if (!uid) redirect("/reset?error=invalid");

  await db.user.update({ where: { id: uid }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await createUserSession(uid);
  redirect("/account");
}
