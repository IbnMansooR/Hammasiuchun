import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { userLoginAction } from "../account/actions";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import { mailEnabled } from "@/lib/mailer";
import SubmitButton from "@/components/SubmitButton";
import AuthTabs from "@/components/AuthTabs";

export const metadata = { title: "Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;

  const emailForm = (
    <form action={userLoginAction}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" name="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="login-password">Parol</label>
        <input id="login-password" type="password" name="password" autoComplete="current-password" required />
      </div>
      <SubmitButton pendingLabel="Kirilmoqda…" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Kirish</SubmitButton>
    </form>
  );

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Kirish</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>Hisobingizga kiring.</p>
        {error === "1" && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            Email yoki parol notoʻgʻri.
          </div>
        )}
        {error === "locked" && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            Juda koʻp notoʻgʻri urinish. Iltimos, 15 daqiqadan soʻng qayta urining.
          </div>
        )}
        {error === "google" && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            Google orqali kirishda xatolik yuz berdi. Qaytadan urinib koʻring.
          </div>
        )}
        <AuthTabs emailForm={emailForm} googleEnabled={googleEnabled} smsEnabled={smsEnabled} />
        {mailEnabled && (
          <p style={{ fontSize: 13.5, marginTop: 14, textAlign: "center" }}>
            <Link href="/forgot">Parolni unutdingizmi?</Link>
          </p>
        )}
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18, textAlign: "center" }}>
          Hisobingiz yoʻqmi? <Link href="/register">Roʻyxatdan oʻtish</Link>
        </p>
      </div>
    </div>
  );
}
