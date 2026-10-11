import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";
import { db } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import { connectTelegramAction, setNotifyNewsAction, setTgNotifyAction, userLogoutAction } from "./actions";
import { botEnabled, botUsername } from "@/lib/telegram";
import { IconArrow, IconBell, IconHeart, IconImage } from "@/components/Icons";

export const metadata = { title: "Mening kabinetim", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; tg?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [unread, prefs, { saved, tg }] = await Promise.all([
    unreadNotifications(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { notifyNews: true, telegramId: true, telegramUsername: true, tgNotify: true } }),
    searchParams,
  ]);

  return (
    <div className="container">
      <header className="page-head narrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", maxWidth: "none" }}>
        <div>
          <div className="eyebrow">Kabinet</div>
          <h1>Salom{user.name ? `, ${user.name}` : ""}.</h1>
          <p className="lead">{user.email ?? user.phone ?? (prefs?.telegramUsername ? `@${prefs.telegramUsername}` : null)}</p>
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
        <Link className="contact-card" href="/account/ishlarim">
          <span className="label"><IconImage style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> Dizaynerlar</span>
          <b>Mening ishlarim</b>
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
      {botEnabled() && (
        <section className="tg-pref" aria-labelledby="h-tg">
          <h2 id="h-tg">Telegram</h2>
          {!prefs?.telegramId ? (
            <>
              <p>Telegramni ulang: shaxsiy xabarlar va yangi shriftlar haqidagi yangiliklar Telegramga keladi, saytga Telegram orqali ham kira olasiz.</p>
              <form action={connectTelegramAction}>
                <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Ochilmoqda…">Telegramni ulash</SubmitButton>
              </form>
            </>
          ) : prefs.tgNotify ? (
            <>
              <p>✓ Xabarlar Telegramga ham keladi{prefs.telegramUsername ? ` (@${prefs.telegramUsername})` : ""}.</p>
              <form action={setTgNotifyAction}>
                <input type="hidden" name="on" value="0" />
                <SubmitButton className="btn btn-sm" pendingLabel="Saqlanmoqda…">Telegram xabarlarini oʻchirish</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p>Telegram hisobingizga ulangan{prefs.telegramUsername ? ` (@${prefs.telegramUsername})` : ""}, lekin xabarlar u yerga yuborilmayapti.</p>
              <form action={setTgNotifyAction}>
                <input type="hidden" name="on" value="1" />
                <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Yoqilmoqda…">Telegramda xabar olish</SubmitButton>
              </form>
            </>
          )}
          {saved === "tg" && <span className="pref-ok" role="status">Saqlandi ✓</span>}
          {tg === "start" && (
            <p className="tg-hint" role="alert">
              Bot sizga hali yoza olmaydi. <a href={`https://t.me/${botUsername()}?start=on`} target="_blank" rel="noopener" className="link">@{botUsername()} ni oching</a> va “Start”ni bosing: xabarlar oʻsha zahoti yoqiladi.
            </p>
          )}
        </section>
      )}
      <p className="muted" style={{ maxWidth: "60ch" }}>
        Feekr’dagi barcha shriftlar bepul — istalgan oilani shrift sahifasidan ZIP qilib yuklab olishingiz mumkin.
      </p>
    </div>
  );
}
