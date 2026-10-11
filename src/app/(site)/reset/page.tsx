import Link from "@/components/LLink";
import type { Metadata } from "next";
import { resetPasswordAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";
import { getLocale } from "@/i18n/server";

const T = {
  uz: {
    title: "Yangi parol",
    invalidA: "Havola eskirgan yoki notoʻgʻri. ",
    invalidLink: "Yangi havola soʻrang",
    short: "Parol kamida 8 belgidan iborat boʻlishi kerak.",
    label: "Yangi parol",
    saving: "Saqlanmoqda…",
    save: "Parolni saqlash",
  },
  ru: {
    title: "Новый пароль",
    invalidA: "Ссылка устарела или неверна. ",
    invalidLink: "Запросите новую",
    short: "Пароль должен быть не короче 8 символов.",
    label: "Новый пароль",
    saving: "Сохраняем…",
    save: "Сохранить пароль",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: T[await getLocale()].title, robots: { index: false } };
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const t = T[await getLocale()];

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>{t.title}</h1>
        {!token || error === "invalid" ? (
          <p className="sub">
            {t.invalidA}<Link href="/forgot">{t.invalidLink}</Link>.
          </p>
        ) : (
          <>
            {error === "password" && <div className="alert alert-error" role="alert">{t.short}</div>}
            <form action={resetPasswordAction} style={{ marginTop: 18 }}>
              <input type="hidden" name="token" value={token} />
              <div className="field">
                <label htmlFor="reset-password">{t.label}</label>
                <input id="reset-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
              </div>
              <SubmitButton pendingLabel={t.saving} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{t.save}</SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
