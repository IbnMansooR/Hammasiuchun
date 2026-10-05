import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";
import { db } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import { setNotifyNewsAction, userLogoutAction } from "./actions";
import { IconArrow, IconBell, IconHeart } from "@/components/Icons";

export const metadata = { title: "Mening kabinetim", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [unread, prefs, { saved }] = await Promise.all([
    unreadNotifications(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { notifyNews: true } }),
    searchParams,
  ]);

  return (
    <div className="container">
      <header className="page-head narrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", maxWidth: "none" }}>
        <div>
          <div className="eyebrow">Kabinet</div>
          <h1>Salom{user.name ? `, ${user.name}` : ""}.</h1>
          <p className="lead">{user.email ?? user.phone}</p>
        </div>
        <form action={userLogoutAction}>
          <button className="btn">Chiqish</button>
        </form>
      </header>

      <div className="contact-grid">
        <Link className="contact-card" href="/account/notifications" prefetch={false}>
          <span className="label"><IconBell style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> Bildirishnomalar</span>
          <b>{unread ? `${unread} ta yangi xabar` : "Barcha xabarlar"}</b>
        </Link>
        <Link className="contact-card" href="/wishlist">
          <span className="label"><IconHeart style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> Sevimlilar</span>
          <b>Saqlangan shriftlar</b>
        </Link>
        <Link className="contact-card" href="/fonts">
          <span className="label">Katalog</span>
          <b>Yangi shrift topish <IconArrow style={{ width: 26, height: 26, display: "inline", verticalAlign: "-4px" }} /></b>
        </Link>
      </div>
      <form action={setNotifyNewsAction} className="pref">
        <label className="check">
          <input type="checkbox" name="news" defaultChecked={prefs?.notifyNews ?? true} />
          <span>Yangi shriftlar va yangiliklar haqida qoʻngʻiroqchada xabar olish</span>
        </label>
        <SubmitButton className="btn btn-sm" pendingLabel="Saqlanmoqda…">Saqlash</SubmitButton>
        {saved === "news" && <span className="pref-ok" role="status">Saqlandi ✓</span>}
      </form>
      <p className="muted" style={{ maxWidth: "60ch" }}>
        Feekr’dagi barcha shriftlar bepul — istalgan oilani shrift sahifasidan ZIP qilib yuklab olishingiz mumkin.
      </p>
    </div>
  );
}
