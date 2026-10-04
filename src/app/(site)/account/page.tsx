import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { userLogoutAction } from "./actions";

export const metadata = { title: "Mening kabinetim" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="container section" style={{ paddingTop: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "clamp(28px,4vw,44px)", marginBottom: 6 }}>Mening kabinetim</h1>
          <p className="muted">{user.name ? `${user.name} · ` : ""}{user.email ?? user.phone}</p>
        </div>
        <form action={userLogoutAction}>
          <button className="btn">Chiqish</button>
        </form>
      </div>

      <p className="muted" style={{ fontSize: 15.5, maxWidth: 560 }}>
        Feekr’dagi barcha shriftlar bepul — istalgan oilani shrift sahifasidan ZIP qilib yuklab olishingiz mumkin.
        Yoqqanlarini ♡ bilan sevimlilarga qoʻshib qoʻying.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <Link href="/wishlist" className="btn btn-accent">Sevimlilar</Link>
        <Link href="/fonts" className="btn">Shriftlarni koʻrish</Link>
      </div>
    </div>
  );
}
