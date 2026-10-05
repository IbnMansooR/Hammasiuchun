import Link from "next/link";
import { resetPasswordAction } from "../account/actions";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Yangi parol", robots: { index: false } };


export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;

  return (
    <div className="container auth">
      <div className="auth-card">
        <h1>Yangi parol</h1>
        {!token || error === "invalid" ? (
          <p className="sub">
            Havola eskirgan yoki notoʻgʻri. <Link href="/forgot">Yangi havola soʻrang</Link>.
          </p>
        ) : (
          <>
            {error === "password" && (
              <div className="alert alert-error" role="alert">
                Parol kamida 8 belgidan iborat boʻlishi kerak.
              </div>
            )}
            <form action={resetPasswordAction} style={{ marginTop: 18 }}>
              <input type="hidden" name="token" value={token} />
              <div className="field">
                <label htmlFor="reset-password">Yangi parol</label>
                <input id="reset-password" type="password" name="password" autoComplete="new-password" minLength={8} required />
              </div>
              <SubmitButton pendingLabel="Saqlanmoqda…" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 8 }}>Parolni saqlash</SubmitButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
