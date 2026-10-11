import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { TWOFA_COOKIE, verifyPending } from "@/lib/adminSecurity";
import { loginAction, verifyAdminCodeAction } from "../actions";

export const metadata = { title: "Admin — Kirish", robots: { index: false } };

const ERRORS: Record<string, string> = {
  "1": "Login yoki parol notoʻgʻri.",
  locked: "Juda koʻp urinish. Birozdan soʻng qayta urining.",
  code: "Kod notoʻgʻri. Telegramdagi oxirgi kodni kiriting.",
  expired: "Kod eskirdi yoki bekor qilindi. Login va parolni qaytadan kiriting.",
  tgsend: "Kodni Telegramga yuborib boʻlmadi. Birozdan soʻng qayta urining.",
};

const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 360 } as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; step?: string }> }) {
  const { error, step } = await searchParams;
  if (await getSession()) redirect("/admin");
  // The code step only makes sense while a password check is pending.
  const pending = step === "code" ? await verifyPending((await cookies()).get(TWOFA_COOKIE)?.value) : null;
  const message = error ? ERRORS[error] ?? ERRORS["1"] : step === "code" && !pending ? ERRORS.expired : null;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--subtle)", padding: 20 }}>
      {pending ? (
        <form action={verifyAdminCodeAction} style={card}>
          <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Telegram kodi</h1>
          <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
            Parol toʻgʻri. Admin Telegramiga 6 xonali kod yuborildi: uni shu yerga kiriting (5 daqiqa amal qiladi).
          </p>
          {message && <div className="adm-notice adm-notice-error" role="alert">{message}</div>}
          <div className="field">
            <label htmlFor="admin-code">Kod</label>
            <input id="admin-code" type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus />
          </div>
          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>Tasdiqlash</button>
          <p className="muted" style={{ fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            Kod kelmadimi? <a href="/admin/login" className="link">Qaytadan kirish</a>
          </p>
        </form>
      ) : (
        <form action={loginAction} style={card}>
          <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Feekr Admin</h1>
          <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>Boshqaruv paneliga kiring</p>
          {message && <div className="adm-notice adm-notice-error" role="alert">{message}</div>}
          <div className="field">
            <label htmlFor="admin-username">Foydalanuvchi</label>
            <input id="admin-username" type="text" name="username" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Parol</label>
            <input id="admin-password" type="password" name="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-accent" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
            Kirish
          </button>
        </form>
      )}
    </div>
  );
}
