import Link from "@/components/LLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { formatDateTime } from "@/lib/format";
import { IconArrow, IconBell, IconChevron } from "@/components/Icons";
import { getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";
import { withLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].account.inbox, robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(await lhref("/login"));
  const locale = await getLocale();
  const t = DICTS[locale].account;

  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = items.filter((n) => !n.readAt).length;

  // Opening the inbox counts as reading it. Done after the response so this
  // render still shows which items are new.
  if (unread) {
    after(() =>
      db.notification
        .updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } })
        .catch(() => {}),
    );
  }

  return (
    <div className="container">
      <nav className="crumbs" aria-label={t.crumbs}>
        <Link href="/account">{t.eyebrow}</Link>
        <IconChevron />
        <span>{t.inbox}</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>{t.inbox}</h1>
        <p className="lead">{unread ? t.unreadN(unread) : t.noNew}</p>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <IconBell />
          <p>{t.inboxEmpty}</p>
        </div>
      ) : (
        <ol className="inbox">
          {items.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "is-new"}>
              <div className="inbox-meta">
                {!n.readAt && <span className="tag tag-new">{t.isNew}</span>}
                <time dateTime={n.createdAt.toISOString()}>{formatDateTime(n.createdAt, locale)}</time>
              </div>
              <h2>{n.title}</h2>
              {n.body && <p>{n.body}</p>}
              {n.link && (
                <a className="link inbox-link" href={withLocale(locale, n.link)} {...(n.link.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer noopener" })}>
                  {t.more} <IconArrow />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
