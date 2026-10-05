import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/userAuth";
import { formatDate } from "@/lib/format";
import { IconChevron, IconImage } from "@/components/Icons";

export const metadata = { title: "Mening ishlarim", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Koʻrib chiqilmoqda", cls: "tag tag-warn" },
  approved: { label: "Chop etilgan", cls: "tag tag-ok" },
  rejected: { label: "Qabul qilinmadi", cls: "tag tag-danger" },
};

export default async function MyWorksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const works = await db.work.findMany({
    where: { submittedById: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, slug: true, title: true, coverImage: true, status: true, rejectReason: true, createdAt: true },
  });

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Yoʻl">
        <Link href="/account">Kabinet</Link>
        <IconChevron />
        <span>Mening ishlarim</span>
      </nav>
      <header className="page-head narrow" style={{ paddingTop: 28 }}>
        <h1>Mening ishlarim</h1>
        <p className="lead">{works.length ? "Yuborgan ishlaringiz va ularning holati." : "Hali ish yubormagansiz."}</p>
      </header>

      <div style={{ marginBottom: 28 }}>
        <Link href="/dizaynerlar/yuborish" className="btn btn-primary">Yangi ish yuborish</Link>
      </div>

      {works.length > 0 && (
        <ul className="my-works">
          {works.map((w) => {
            const st = STATUS[w.status] ?? STATUS.pending;
            return (
              <li key={w.id}>
                <div className="my-works-cover">{w.coverImage ? <img src={w.coverImage} alt="" loading="lazy" /> : <IconImage />}</div>
                <div className="my-works-body">
                  <span className={st.cls}>{st.label}</span>
                  <b>{w.title}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{formatDate(w.createdAt)}</span>
                  {w.status === "rejected" && w.rejectReason && <p className="my-works-reason"><span className="muted">Sabab:</span> {w.rejectReason}</p>}
                  {w.status === "approved" && <Link href={`/dizaynerlar/${w.slug}`} className="link">Saytda koʻrish</Link>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
