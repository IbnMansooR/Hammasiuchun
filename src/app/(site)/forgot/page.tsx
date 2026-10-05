import Link from "next/link";
import { notFound } from "next/navigation";
import { mailEnabled } from "@/lib/mailer";
import { requestPasswordResetAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Parolni tiklash", robots: { index: false } };


export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  if (!mailEnabled) notFound(); // hidden until an email provider is configured
  const { sent, error } = await searchParams;

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>Parolni tiklash</h1>
        {sent ? (
          <p className="sub">
            Agar bu email bilan hisob boʻlsa, unga parolni tiklash havolasi yuborildi. Pochtangizni (va “Spam” papkasini) tekshiring.
          </p>
        ) : (
          <>
            <p className="sub">Emailingizni kiriting — yangi parol oʻrnatish havolasini yuboramiz.</p>
            {error === "locked" && (
              <div className="alert alert-error" role="alert">
                Juda koʻp soʻrov. Birozdan soʻng qayta urinib koʻring.
              </div>
            )}
            <form action={requestPasswordResetAction}>
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <input id="forgot-email" type="email" name="email" autoComplete="email" required />
              </div>
              <SubmitButton pendingLabel="Yuborilmoqda…" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>Havolani yuborish</SubmitButton>
            </form>
          </>
        )}
        <p className="auth-foot">
          <Link href="/login">Kirish sahifasiga qaytish</Link>
        </p>
      </div>
    </div>
  );
}
