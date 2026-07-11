import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { registerAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Ro'yxatdan o'tish" };

const ERRORS: Record<string, string> = {
  email: "Email manzilini to'g'ri kiriting.",
  password: "Parol kamida 8 belgidan iborat bo'lishi kerak.",
  exists: "Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 }}>
        <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Ro'yxatdan o'tish</div>
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
            <label>Ism (ixtiyoriy)</label>
            <input type="text" name="name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>
          <div className="field">
            <label>Parol</label>
            <input type="password" name="password" required minLength={8} />
          </div>
          <SubmitButton style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Ro&apos;yxatdan o&apos;tish</SubmitButton>
        </form>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18, textAlign: "center" }}>
          Hisobingiz bormi? <Link href="/login">Kirish</Link><br />
          Google yoki telefon raqami orqali ham <Link href="/login">shu yerdan</Link> kirishingiz mumkin.
        </p>
      </div>
    </div>
  );
}
