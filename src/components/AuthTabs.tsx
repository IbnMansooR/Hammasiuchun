"use client";
import { useState } from "react";
import PhoneLoginForm from "./PhoneLoginForm";

export default function AuthTabs({
  emailForm, googleEnabled, smsEnabled,
}: {
  emailForm: React.ReactNode;
  googleEnabled: boolean;
  smsEnabled: boolean;
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

      {googleEnabled && (
        <>
          <div className="divider">yoki</div>
          <a href="/api/auth/google" className="btn btn-lg btn-block">
            Google orqali davom etish
          </a>
        </>
      )}
    </div>
  );
}
