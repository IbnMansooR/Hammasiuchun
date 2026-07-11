import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { userLoginAction } from "../account/actions";
import { googleEnabled } from "@/lib/googleAuth";
import { smsEnabled } from "@/lib/eskiz";
import SubmitButton from "@/components/SubmitButton";
import AuthTabs from "@/components/AuthTabs";

export const metadata = { title: "Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;

  const emailForm = (
    <form action={userLoginAction}>
      <div className="field">
        <label>Email</label>
        <input type="email" name="email" required />
      </div>
      <div className="field">
        <label>Parol</label>
        <input type="password" name="password" required />
      </div>
      <SubmitButton style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Kirish</SubmitButton>
    </form>
  );

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 }}>
        <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Kirish</div>
        <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>Hisobingizga kiring.</p>
        {error === "1" && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            Email yoki parol noto&apos;g&apos;ri.
          </div>
        )}
        {error === "google" && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            Google orqali kirishda xatolik yuz berdi. Qaytadan urinib ko&apos;ring.
          </div>
        )}
        <AuthTabs emailForm={emailForm} googleEnabled={googleEnabled} smsEnabled={smsEnabled} />
        <p className="muted" style={{ fontSize: 13.5, marginTop: 18, textAlign: "center" }}>
          Hisobingiz yo&apos;qmi? <Link href="/register">Ro&apos;yxatdan o&apos;tish</Link>
        </p>
      </div>
    </div>
  );
}
