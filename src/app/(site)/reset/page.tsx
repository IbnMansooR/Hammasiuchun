import Link from "next/link";
import { resetPasswordAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Yangi parol", robots: { index: false } };

const box = { background: "var(--surface, #fff)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 400 } as const;

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;

  return (
    <div className="container section" style={{ paddingTop: 40, display: "grid", placeItems: "center" }}>
      <div style={box}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Yangi parol</h1>
        {!token || error === "invalid" ? (
          <p className="muted" style={{ fontSize: 14.5 }}>
            Havola eskirgan yoki notoʻgʻri. <Link href="/forgot">Yangi havola soʻrang</Link>.
          </p>
        ) : (
          <>
            {error === "password" && (
              <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, margin: "12px 0 16px" }}>
                Parol kamida 8 belgidan iborat boʻlishi kerak.
              </div>
            )}
            <form action={resetPasswordAction} style={{ marginTop: 18 }}>
              <input type="hidden" name="token" value={token} />
              <div className="field">
                <label htmlFor="reset-password">Yangi parol</label>
                <input id="reset-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
              </div>
              <SubmitButton pendingLabel="Saqlanmoqda…" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Parolni saqlash</SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
