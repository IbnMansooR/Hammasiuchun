import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { registerAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";

export const metadata = { title: "Ro'yxatdan o'tish" };

const ERRORS: Record<string, string> = {
  email: "Email manzilini to'g'ri kiriting.",
  password: "Parol kamida 8 belgidan iborat bo'lishi kerak.",
  exists: "Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;
  // Only advertise the sign-in methods that are actually configured.
  const altLogin = [googleEnabled && "Google", smsEnabled && "telefon raqami"].filter(Boolean).join(" yoki ");

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Ro&apos;yxatdan o&apos;tish</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
          Hisob oching — sotib olgan shriftlaringiz doim &quot;Mening xaridlarim&quot;da qoladi, kompyuteringizdan
          o&apos;chib ketsa ham qayta yuklab olasiz.
        </p>
        {error && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            {ERRORS[error] ?? "Xatolik yuz berdi."}
          </div>
        )}
        <form action={registerAction}>
          <div className="field">
            <label htmlFor="reg-name">Ism (ixtiyoriy)</label>
            <input id="reg-name" type="text" name="name" autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" name="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Parol</label>
            <input id="reg-password" type="password" name="password" autoComplete="new-password" required minLength={8} />
          </div>
          <SubmitButton pendingLabel="Yuborilmoqda…" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Ro&apos;yxatdan o&apos;tish</SubmitButton>
        </form>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18, textAlign: "center" }}>
          Hisobingiz bormi? <Link href="/login">Kirish</Link>
          {altLogin && (
            <>
              <br />
              {altLogin} orqali ham <Link href="/login">shu yerdan</Link> kirishingiz mumkin.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
