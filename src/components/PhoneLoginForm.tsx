"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneOtpAction, verifyPhoneOtpAction } from "@/app/(site)/account/actions";
import { useLhref, useT } from "@/i18n/client";

export default function PhoneLoginForm() {
  const router = useRouter();
  const t = useT().auth;
  const lhref = useLhref();
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
    else setError(res.error ?? t.errOther);
  }

  async function confirmCode() {
    setError(null);
    setPending(true);
    const res = await verifyPhoneOtpAction(phone, code);
    setPending(false);
    if (res.ok) router.push(lhref("/account"));
    else setError(res.error ?? t.errOther);
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="otp-phone">{t.phone}</label>
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
          <label htmlFor="otp-code">{t.smsCode}</label>
          <input id="otp-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
        </div>
      )}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {step === "phone" ? (
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={pending || !phone} onClick={requestCode}>
          {pending ? t.sending : t.sendCode}
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-lg btn-block" disabled={pending || !code} onClick={confirmCode}>
          {pending ? t.checking : t.confirm}
        </button>
      )}
    </div>
  );
}
