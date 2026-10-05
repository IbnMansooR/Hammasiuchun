import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { formatDateTime } from "@/lib/format";
import { IconArrow, IconBell, IconChevron } from "@/components/Icons";

export const metadata = { title: "Bildirishnomalar", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
      <nav className="crumbs" aria-label="Yoʻl">
        <Link href="/account">Kabinet</Link>
        <IconChevron />
        <span>Bildirishnomalar</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>Bildirishnomalar</h1>
        <p className="lead">{unread ? `${unread} ta yangi xabar` : "Yangi xabar yoʻq"}</p>
      </header>

      {items.length === 0 ? (
        <div className="empty">
          <IconBell />
          <p>Hozircha xabar yoʻq. Feekr jamoasidan yangiliklar shu yerda paydo boʻladi.</p>
        </div>
      ) : (
        <ol className="inbox">
          {items.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "is-new"}>
              <div className="inbox-meta">
                {!n.readAt && <span className="tag tag-new">Yangi</span>}
                <time dateTime={n.createdAt.toISOString()}>{formatDateTime(n.createdAt)}</time>
              </div>
              <h2>{n.title}</h2>
              {n.body && <p>{n.body}</p>}
              {n.link && (
                <a className="link inbox-link" href={n.link} {...(n.link.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer noopener" })}>
                  Batafsil <IconArrow />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
