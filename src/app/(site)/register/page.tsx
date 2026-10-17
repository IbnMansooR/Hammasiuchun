import Link from "@/components/LLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { registerAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import { telegramLoginBot } from "@/lib/telegramAuth";
import TelegramLogin from "@/components/TelegramLogin";
import { IconBell, IconHeart, IconImage } from "@/components/Icons";
import { alternates, getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].auth.registerTitle, alternates: await alternates("/register") };
}

const PERK_ICONS = [IconHeart, IconBell, IconImage];

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect(await lhref("/account"));
  const { error } = await searchParams;
  const locale = await getLocale();
  const t = DICTS[locale].auth;
  const bot = await telegramLoginBot();

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>{t.registerTitle}</h1>
        <p className="sub">{t.registerSub}</p>
        <ul className="perks">
          {t.perks.map((p, i) => {
            const Icon = PERK_ICONS[i];
            return <li key={p}><Icon aria-hidden="true" /><span>{p}</span></li>;
          })}
        </ul>
        {error && (
          <div className="alert alert-error" role="alert">
            {t.regErrors[error] ?? t.errOther}
          </div>
        )}
        {(googleEnabled || bot) && (
          <>
            <div className="oneclick">
              {googleEnabled && <a href={locale === "ru" ? "/api/auth/google?lang=ru" : "/api/auth/google"} className="btn btn-lg btn-block">{t.google}</a>}
              {bot && <TelegramLogin bot={bot} />}
            </div>
            <div className="divider">{t.orEmail}</div>
          </>
        )}
        <form action={registerAction}>
          <div className="field">
            <label htmlFor="reg-email">{t.email}</label>
            <input id="reg-email" type="email" name="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="reg-password">{t.password}</label>
            <input id="reg-password" type="password" name="password" autoComplete="new-password" required minLength={8} />
          </div>
          <SubmitButton pendingLabel={t.sending} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{t.register}</SubmitButton>
        </form>
        <p className="auth-foot">
          {t.haveAccount} <Link href="/login">{t.login}</Link>
          {smsEnabled && (
            <>
              <br />
              {t.phoneTooA}<Link href="/login">{t.phoneTooLink}</Link>{t.phoneTooB}
            </>
          )}
        </p>
        <p className="auth-fine">{t.freeAnyway}</p>
      </div>
    </div>
  );
}
