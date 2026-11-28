import Link from "@/components/LLink";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { formatDate } from "@/lib/format";
import { IconChevron, IconImage } from "@/components/Icons";
import { getLocale, lhref } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";

export async function generateMetadata(): Promise<Metadata> {
  return { title: DICTS[await getLocale()].account.myWorks, robots: { index: false } };
}

const STATUS_CLS: Record<string, string> = { pending: "tag tag-warn", approved: "tag tag-ok", rejected: "tag tag-danger" };

export default async function MyWorksPage() {
  const user = await getCurrentUser();
  if (!user) redirect(await lhref("/login"));
  const locale = await getLocale();
  const t = DICTS[locale].account;
  const works = await db.work.findMany({
    where: { submittedById: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, slug: true, title: true, coverImage: true, status: true, rejectReason: true, createdAt: true },
  });

  return (
    <div className="container">
      <nav className="crumbs" aria-label={t.crumbs}>
        <Link href="/account">{t.eyebrow}</Link>
        <IconChevron />
        <span>{t.myWorks}</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>{t.myWorks}</h1>
        <p className="lead">{works.length ? t.worksLead : t.worksNone}</p>
      </header>

      <div style={{ marginBottom: 28 }}>
        <Link href="/dizaynerlar/yuborish" className="btn btn-primary">{t.newWork}</Link>
      </div>

      {works.length > 0 && (
        <ul className="my-works">
          {works.map((w) => {
            const status = STATUS_CLS[w.status] ? w.status : "pending";
            return (
              <li key={w.id}>
                <div className="my-works-cover">{w.coverImage ? <img src={w.coverImage} alt="" loading="lazy" /> : <IconImage />}</div>
                <div className="my-works-body">
                  <span className={STATUS_CLS[status]}>{t.status[status]}</span>
                  <b>{w.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{formatDate(w.createdAt, locale)}</span>
                  {w.status === "rejected" && w.rejectReason && <p className="my-works-reason"><span className="muted">{t.reason}</span> {w.rejectReason}</p>}
                  {w.status === "approved" && <Link href={`/dizaynerlar/${w.slug}`} className="link">{t.viewOnSite}</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
