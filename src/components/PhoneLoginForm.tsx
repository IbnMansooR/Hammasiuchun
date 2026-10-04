"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/app/(site)/account/actions";

export default function PhoneLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setError(null);
    setPending(true);
    const res = await sendPhoneOtpAction(phone);
    setPending(false);
    if (res.ok) setStep("code");
    else setError(res.error ?? "Xatolik yuz berdi.");
  }

  async function confirmCode() {
    setError(null);
    setPending(true);
    const res = await verifyPhoneOtpAction(phone, code);
    setPending(false);
    if (res.ok) router.push("/account");
    else setError(res.error ?? "Xatolik yuz berdi.");
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="otp-phone">Telefon raqami</label>
        <input
          id="otp-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="998901234567"
          disabled={step === "code"}
        />
      </div>
      {step === "code" && (
        <div className="field">
          <label htmlFor="otp-code">SMS orqali kelgan kod</label>
          <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        </div>
      )}
      {error && <p style={{ color: "#b91c1c", fontSize: 13, marginTop: -6, marginBottom: 10 }}>{error}</p>}
      {step === "phone" ? (
        <button type="button" className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={pending || !phone} onClick={requestCode}>
          {pending ? "Yuborilmoqda…" : "Kod yuborish"}
        </button>
      ) : (
        <button type="button" className="btn btn-accent" style={{ width: "100%", justifyContent: "center" }} disabled={pending || !code} onClick={confirmCode}>
          {pending ? "Tekshirilmoqda…" : "Tasdiqlash"}
        </button>
      )}
    </div>
  );
}
