"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUserSession, destroyUserSession, verifyUserPassword, isValidEmail } from "@/lib/userAuth";
import { sendSms, normalizePhone, smsEnabled } from "@/lib/eskiz";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

export async function registerAction(fd: FormData) {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");

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

  const userId = await verifyUserPassword(email, password);
  if (!userId) redirect("/login?error=1");

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
  if (!phone) return { ok: false, error: "Telefon raqamini to'g'ri kiriting (masalan 998901234567)." };

  const last = await db.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false, error: "Kod yuborildi, birozdan so'ng qayta urinib ko'ring." };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  await db.phoneOtp.create({ data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {}); // fresh code, fresh attempts
  const sent = await sendSms(phone, `Feekr tasdiqlash kodi: ${code}`);
  if (!sent) return { ok: false, error: "SMS yuborilmadi. Birozdan so'ng qayta urinib ko'ring." };
  return { ok: true };
}

export async function verifyPhoneOtpAction(rawPhone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, error: "Telefon raqamini to'g'ri kiriting." };

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
      return { ok: false, error: "Juda ko'p noto'g'ri urinish. Yangi kod so'rang." };
    }
    return { ok: false, error: "Kod noto'g'ri yoki muddati o'tgan." };
  }

  await db.phoneOtp.update({ where: { id: otp.id }, data: { consumed: true } });
  await db.loginAttempt.delete({ where: { key: `otp:${phone}` } }).catch(() => {});
  let user = await db.user.findUnique({ where: { phone } });
  if (!user) user = await db.user.create({ data: { phone } });

  await createUserSession(user.id);
  return { ok: true };
}
