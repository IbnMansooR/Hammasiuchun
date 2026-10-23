"use client";
import { useState } from "react";
import PhoneLoginForm from "./PhoneLoginForm";
import TelegramLogin from "./TelegramLogin";
import { useLocale, useT } from "@/i18n/client";

export default function AuthTabs({
  emailForm, googleEnabled, smsEnabled, telegramBot = null,
}: {
  emailForm: React.ReactNode;
  googleEnabled: boolean;
  smsEnabled: boolean;
  /** Bot username when "Log in with Telegram" is configured. */
  telegramBot?: string | null;
}) {
  const [tab, setTab] = useState<"email" | "phone">("email");
  const t = useT().auth;
  const locale = useLocale();

  return (
    <div>
      {smsEnabled && (
        <div className="seg" role="group" aria-label={t.method} style={{ marginBottom: 20, display: "flex" }}>
          <button type="button" style={{ flex: 1 }} aria-pressed={tab === "email"} onClick={() => setTab("email")}>{t.email}</button>
          <button type="button" style={{ flex: 1 }} aria-pressed={tab === "phone"} onClick={() => setTab("phone")}>{t.phoneTab}</button>
        </div>
      )}

      {tab === "email" ? emailForm : <PhoneLoginForm />}

      {(googleEnabled || telegramBot) && (
        <>
          <div className="divider">{t.or}</div>
          <div className="oneclick">
            {googleEnabled && (
              <a href={locale === "ru" ? "/api/auth/google?lang=ru" : "/api/auth/google"} className="btn btn-lg btn-block">
                {t.google}
              </a>
            )}
            {telegramBot && <TelegramLogin bot={telegramBot} />}
          </div>
        </>
      )}
    </div>
  );
}
