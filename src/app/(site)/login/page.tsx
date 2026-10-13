import Link from "@/components/LLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { userLoginAction } from "../account/actions";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import { telegramLoginBot } from "@/lib/telegramAuth";
import { mailEnabled } from "@/lib/mailer";
import SubmitButton from "@/components/SubmitButton";
import AuthTabs from "@/components/AuthTabs";
import { formatDateTime } from "@/lib/format";
import { getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].auth.loginTitle, robots: { index: false } };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; until?: string; for?: string }> }) {
  if (await getCurrentUser()) redirect(await lhref("/account"));
  const { error, until, for: why } = await searchParams;
  const locale = await getLocale();
  const t = DICTS[locale].auth;
  // Only the date is taken from the URL (never free text), so the message can't be spoofed.
  const untilAt = until ? new Date(until) : null;
  const untilText = untilAt && untilAt > new Date() ? formatDateTime(untilAt, locale) : "";

  const emailForm = (
    <form action={userLoginAction}>
      <div className="field">
        <label htmlFor="login-email">{t.email}</label>
        <input id="login-email" type="email" name="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="login-password">{t.password}</label>
        <input id="login-password" type="password" name="password" autoComplete="current-password" required />
      </div>
      <SubmitButton pendingLabel={t.loggingIn} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{t.login}</SubmitButton>
    </form>
  );

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>{t.loginTitle}</h1>
        <p className="sub">{t.loginSub}</p>
        {why === "wish" && !error && <div className="alert alert-info" role="status">{DICTS[locale].wishlist.needLogin}</div>}
        {error === "1" && <div className="alert alert-error" role="alert">{t.errWrong}</div>}
        {error === "locked" && <div className="alert alert-error" role="alert">{t.errLocked}</div>}
        {error === "blocked" && (
          <div className="alert alert-error" role="alert">
            {untilText ? <>{t.blockedUntilA}<b>{untilText}</b>{t.blockedUntilB}</> : <>{t.blocked}</>}{" "}
            {t.blockedHelpA}<Link href="/support" className="link">{t.blockedHelpLink}</Link>{t.blockedHelpB}
          </div>
        )}
        {error === "telegram" && <div className="alert alert-error" role="alert">{t.errTelegram}</div>}
        {error === "google" && <div className="alert alert-error" role="alert">{t.errGoogle}</div>}
        <AuthTabs emailForm={emailForm} googleEnabled={googleEnabled} smsEnabled={smsEnabled} telegramBot={await telegramLoginBot()} />
        {mailEnabled && (
          <p className="auth-foot" style={{ marginTop: 14 }}>
            <Link href="/forgot">{t.forgot}</Link>
          </p>
        )}
        <p className="auth-foot">
          {t.noAccount} <Link href="/register">{t.register}</Link>
        </p>
      </div>
    </div>
  );
}
