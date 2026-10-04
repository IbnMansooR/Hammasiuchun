import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "../actions";

export const metadata = { title: "Admin — Kirish" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await getSession()) redirect("/admin");
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--subtle)", padding: 20 }}>
      <form action={loginAction}
        style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18, padding: 34, width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 4, letterSpacing: "normal", lineHeight: 1.5 }}>Feekr Admin</h1>
        <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>Boshqaruv paneliga kiring</p>
        {error && (
          <div style={{ background: "#fdecec", color: "#b91c1c", padding: "10px 12px", borderRadius: 10, fontSize: 13.5, marginBottom: 16 }}>
            {error === "locked"
              ? "Juda koʻp urinish. Iltimos, 15 daqiqadan soʻng qayta urining."
              : "Login yoki parol notoʻgʻri."}
          </div>
        )}
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
    </div>
  );
}
