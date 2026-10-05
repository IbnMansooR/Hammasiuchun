"use client";
import { useState } from "react";
import PhoneLoginForm from "./PhoneLoginForm";
import TelegramLogin from "./TelegramLogin";

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

  return (
    <div>
      {smsEnabled && (
        <div className="seg" role="group" aria-label="Kirish usuli" style={{ marginBottom: 20, display: "flex" }}>
          <button type="button" style={{ flex: 1 }} aria-pressed={tab === "email"} onClick={() => setTab("email")}>Email</button>
          <button type="button" style={{ flex: 1 }} aria-pressed={tab === "phone"} onClick={() => setTab("phone")}>Telefon</button>
        </div>
      )}

      {tab === "email" ? emailForm : <PhoneLoginForm />}

      {(googleEnabled || telegramBot) && (
        <>
          <div className="divider">yoki</div>
          <div className="oneclick">
            {googleEnabled && (
              <a href="/api/auth/google" className="btn btn-lg btn-block">
                Google orqali davom etish
              </a>
            )}
            {telegramBot && <TelegramLogin bot={telegramBot} />}
          </div>
        </>
      )}
    </div>
  );
}
