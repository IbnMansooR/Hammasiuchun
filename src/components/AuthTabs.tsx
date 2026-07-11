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
        <div className="toolbar" style={{ marginBottom: 18 }}>
          <button type="button" className={`chip${tab === "email" ? " active" : ""}`} onClick={() => setTab("email")}>Email</button>
          <button type="button" className={`chip${tab === "phone" ? " active" : ""}`} onClick={() => setTab("phone")}>Telefon</button>
        </div>
      )}

      {tab === "email" ? emailForm : <PhoneLoginForm />}

      {googleEnabled && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span className="muted" style={{ fontSize: 12.5 }}>yoki</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <a href="/api/auth/google" className="btn" style={{ width: "100%", justifyContent: "center" }}>
            Google orqali davom etish
          </a>
        </>
      )}
    </div>
  );
}
