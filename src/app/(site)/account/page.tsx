import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { formatPrice, formatDate } from "@/lib/format";
import { userLogoutAction } from "./actions";

export const metadata = { title: "Mening kabinetim" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const purchases = await db.purchase.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

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

      <h2 style={{ fontSize: 20, marginBottom: 14 }}>Mening xaridlarim</h2>
      {purchases.length === 0 ? (
        <div>
          <p className="muted" style={{ fontSize: 15.5 }}>
            Hali hech narsa sotib olmagansiz. Xarid qilgan shriftlaringiz doim shu yerda qoladi —
            kompyuteringizdan o&apos;chib ketsa ham qayta yuklab olishingiz mumkin.
          </p>
          <Link href="/fonts" className="btn btn-accent" style={{ marginTop: 16 }}>Shriftlarni ko&apos;rish</Link>
        </div>
      ) : (
        <div>
          {purchases.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
              <div>
                <Link href={`/fonts/${p.familySlug}`} style={{ fontSize: 18, fontWeight: 700 }}>{p.familyName}</Link>
                <div className="muted" style={{ fontSize: 13 }}>{formatPrice(p.priceCents, false)} · {formatDate(p.createdAt)}</div>
              </div>
              <a className="btn btn-sm btn-accent" href={`/api/library/${p.familySlug}`}>Yuklab olish</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
