import Link from "next/link";
import { notFound } from "next/navigation";
import { mailEnabled } from "@/lib/mailer";
import { requestPasswordResetAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Parolni tiklash", robots: { index: false } };

const box = { background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 } as const;

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  if (!mailEnabled) notFound(); // hidden until an email provider is configured
  const { sent, error } = await searchParams;

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={box}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Parolni tiklash</h1>
        {sent ? (
          <p className="muted" style={{ fontSize: 14.5 }}>
            Agar bu email bilan hisob boʻlsa, unga parolni tiklash havolasi yuborildi. Pochtangizni (va “Spam” papkasini) tekshiring.
          </p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>Emailingizni kiriting — yangi parol oʻrnatish havolasini yuboramiz.</p>
            {error === "locked" && (
              <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
                Juda koʻp soʻrov. Birozdan soʻng qayta urinib koʻring.
              </div>
            )}
            <form action={requestPasswordResetAction}>
              <div className="field">
                <label htmlFor="forgot-email">Email</label>
                <input id="forgot-email" type="email" name="email" autoComplete="email" required />
              </div>
              <SubmitButton pendingLabel="Yuborilmoqda…" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Havolani yuborish</SubmitButton>
            </form>
          </>
        )}
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18, textAlign: "center" }}>
          <Link href="/login">Kirish sahifasiga qaytish</Link>
        </p>
      </div>
    </div>
  );
}
