import Link from "@/components/LLink";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { mailEnabled } from "@/lib/mailer";
import { requestPasswordResetAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";
import { getLocale } from "@/i18n/server";

const T = {
  uz: {
    title: "Parolni tiklash",
    sent: "Agar bu email bilan hisob boʻlsa, unga parolni tiklash havolasi yuborildi. Pochtangizni (va “Spam” papkasini) tekshiring.",
    sub: "Emailingizni kiriting — yangi parol oʻrnatish havolasini yuboramiz.",
    locked: "Juda koʻp soʻrov. Birozdan soʻng qayta urinib koʻring.",
    sending: "Yuborilmoqda…",
    send: "Havolani yuborish",
    back: "Kirish sahifasiga qaytish",
  },
  ru: {
    title: "Восстановление пароля",
    sent: "Если аккаунт с таким email существует, на него отправлена ссылка для восстановления пароля. Проверьте почту (и папку «Спам»).",
    sub: "Введите email — мы пришлём ссылку для установки нового пароля.",
    locked: "Слишком много запросов. Попробуйте немного позже.",
    sending: "Отправляем…",
    send: "Отправить ссылку",
    back: "Вернуться ко входу",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: T[await getLocale()].title, robots: { index: false } };
}

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  if (!mailEnabled) notFound(); // hidden until an email provider is configured
  const { sent, error } = await searchParams;
  const t = T[await getLocale()];

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>{t.title}</h1>
        {sent ? (
          <p className="sub">{t.sent}</p>
        ) : (
          <>
            <p className="sub">{t.sub}</p>
            {error === "locked" && <div className="alert alert-error" role="alert">{t.locked}</div>}
            <form action={requestPasswordResetAction}>
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <input id="forgot-email" type="email" name="email" autoComplete="email" required />
              </div>
              <SubmitButton pendingLabel={t.sending} className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>{t.send}</SubmitButton>
            </form>
          </>
        )}
        <p className="auth-foot">
          <Link href="/login">{t.back}</Link>
        </p>
      </div>
    </div>
  );
}
