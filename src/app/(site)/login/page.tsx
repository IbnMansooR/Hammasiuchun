import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { userLoginAction } from "../account/actions";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import { telegramEnabled, telegramBot } from "@/lib/telegramAuth";
import { mailEnabled } from "@/lib/mailer";
import SubmitButton from "@/components/SubmitButton";
import AuthTabs from "@/components/AuthTabs";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; until?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error, until } = await searchParams;
  // Only the date is taken from the URL (never free text), so the message can't be spoofed.
  const untilAt = until ? new Date(until) : null;
  const untilText = untilAt && untilAt > new Date() ? formatDateTime(untilAt) : "";

  const emailForm = (
    <form action={userLoginAction}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" name="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="login-password">Parol</label>
        <input id="login-password" type="password" name="password" autoComplete="current-password" required />
      </div>
      <SubmitButton pendingLabel="Kirilmoqda…" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>Kirish</SubmitButton>
    </form>
  );

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>Kirish</h1>
        <p className="sub">Hisobingizga kiring.</p>
        {error === "1" && (
          <div className="alert alert-error" role="alert">
            Email yoki parol notoʻgʻri.
          </div>
        )}
        {error === "locked" && (
          <div className="alert alert-error" role="alert">
            Juda koʻp notoʻgʻri urinish. Iltimos, 15 daqiqadan soʻng qayta urining.
          </div>
        )}
        {error === "blocked" && (
          <div className="alert alert-error" role="alert">
            {untilText ? <>Hisobingiz <b>{untilText}</b> gacha vaqtincha cheklangan.</> : <>Hisobingiz bloklangan.</>}{" "}
            Savollar boʻlsa, <Link href="/support" className="link">biz bilan bogʻlaning</Link>.
          </div>
        )}
        {error === "telegram" && (
          <div className="alert alert-error" role="alert">
            Telegram orqali kirishda xatolik yuz berdi. Qaytadan urinib koʻring.
          </div>
        )}
        {error === "google" && (
          <div className="alert alert-error" role="alert">
            Google orqali kirishda xatolik yuz berdi. Qaytadan urinib koʻring.
          </div>
        )}
        <AuthTabs emailForm={emailForm} googleEnabled={googleEnabled} smsEnabled={smsEnabled} telegramBot={telegramEnabled ? telegramBot : null} />
        {mailEnabled && (
          <p className="auth-foot" style={{ marginTop: 14 }}>
            <Link href="/forgot">Parolni unutdingizmi?</Link>
          </p>
        )}
        <p className="auth-foot">
          Hisobingiz yoʻqmi? <Link href="/register">Roʻyxatdan oʻtish</Link>
        </p>
      </div>
    </div>
  );
}
