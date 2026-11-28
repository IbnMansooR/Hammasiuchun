import Link from "@/components/LLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, unreadNotifications } from "@/lib/userAuth";
import { db } from "@/lib/db";
import SubmitButton from "@/components/SubmitButton";
import { connectTelegramAction, setNotifyNewsAction, setTgNotifyAction, userLogoutAction } from "./actions";
import { botEnabled, botUsername } from "@/lib/telegram";
import { IconArrow, IconBell, IconHeart, IconImage } from "@/components/Icons";
import { getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].account.metaTitle, robots: { index: false } };
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; tg?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect(await lhref("/login"));
  const t = DICTS[await getLocale()].account;
  const [unread, prefs, { saved, tg }] = await Promise.all([
    unreadNotifications(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { notifyNews: true, telegramId: true, telegramUsername: true, tgNotify: true } }),
    searchParams,
  ]);

  return (
    <div className="container">
      <header className="page-head narrow" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", maxWidth: "none" }}>
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.hello(user.name)}</h1>
          <p className="lead">{user.email ?? user.phone ?? (prefs?.telegramUsername ? `@${prefs.telegramUsername}` : null)}</p>
        </div>
        <form action={userLogoutAction}>
          <button className="btn">{t.logout}</button>
        </form>
      </header>

      <div className="contact-grid">
        <Link className="contact-card" href="/account/notifications" prefetch={false}>
          <span className="label"><IconBell style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> {t.inbox}</span>
          <b>{unread ? t.unreadN(unread) : t.allMessages}</b>
        </Link>
        <Link className="contact-card" href="/account/ishlarim">
          <span className="label"><IconImage style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> {t.designers}</span>
          <b>{t.myWorks}</b>
        </Link>
        <Link className="contact-card" href="/wishlist">
          <span className="label"><IconHeart style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> {t.wishlist}</span>
          <b>{t.saved}</b>
        </Link>
        <Link className="contact-card" href="/fonts">
          <span className="label">{t.catalog}</span>
          <b>{t.findFont} <IconArrow style={{ width: 26, height: 26, display: "inline", verticalAlign: "-4px" }} /></b>
        </Link>
      </div>
      <form action={setNotifyNewsAction} className="pref">
        <label className="check">
          <input type="checkbox" name="news" defaultChecked={prefs?.notifyNews ?? true} />
          <span>{t.news}</span>
        </label>
        <SubmitButton className="btn btn-sm" pendingLabel={t.saving}>{t.save}</SubmitButton>
        {saved === "news" && <span className="pref-ok" role="status">{t.savedOk}</span>}
      </form>
      {botEnabled() && (
        <section className="tg-pref" aria-labelledby="h-tg">
          <h2 id="h-tg">Telegram</h2>
          {!prefs?.telegramId ? (
            <>
              <p>{t.tgConnectText}</p>
              <form action={connectTelegramAction}>
                <SubmitButton className="btn btn-accent btn-sm" pendingLabel={t.opening}>{t.tgConnect}</SubmitButton>
              </form>
            </>
          ) : prefs.tgNotify ? (
            <>
              <p>{t.tgOn(prefs.telegramUsername)}</p>
              <form action={setTgNotifyAction}>
                <input type="hidden" name="on" value="0" />
                <SubmitButton className="btn btn-sm" pendingLabel={t.saving}>{t.tgOff}</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p>{t.tgLinked(prefs.telegramUsername)}</p>
              <form action={setTgNotifyAction}>
                <input type="hidden" name="on" value="1" />
                <SubmitButton className="btn btn-accent btn-sm" pendingLabel={t.turningOn}>{t.tgTurnOn}</SubmitButton>
              </form>
            </>
          )}
          {saved === "tg" && <span className="pref-ok" role="status">{t.savedOk}</span>}
          {tg === "start" && (
            <p className="tg-hint" role="alert">
              {t.tgHintA}<a href={`https://t.me/${botUsername()}?start=on`} target="_blank" rel="noopener" className="link">{t.tgHintLink(botUsername())}</a>{t.tgHintB}
            </p>
          )}
        </section>
      )}
      <p className="muted" style={{ maxWidth: "60ch" }}>
        {t.allFree}
      </p>
    </div>
  );
}
