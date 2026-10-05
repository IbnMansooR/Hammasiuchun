import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { KIND_LABEL, splitLines } from "@/lib/works";
import { approveWorkAction, deleteWorkAction, rejectWorkAction, toggleWorkAction } from "@/app/admin/workActions";
import Notice from "@/components/admin/Notice";
import ConfirmButton from "@/components/ConfirmButton";
import { IconImage } from "@/components/Icons";

export const metadata = { title: "Admin — Dizaynerlar" };

export default async function WorksAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const works = await db.work.findMany({ orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  const published = works.filter((w) => w.isPublished).length;
  const pending = works.filter((w) => w.status === "pending");
  const rest = works.filter((w) => w.status !== "pending");

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dizaynerlar</h1>
          <p className="adm-sub">Oʻz ishlaringiz va reklama qilinadigan hamkor dizaynerlar ishlari · {published} ta saytda</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dizaynerlar" target="_blank" className="btn btn-sm">Sahifani ochish</Link>
          <Link href="/admin/works/new" className="btn btn-accent btn-sm">+ Yangi ish</Link>
        </div>
      </div>
      {ok === "saved" && <Notice>Saqlandi.</Notice>}
      {ok === "deleted" && <Notice>Ish oʻchirildi.</Notice>}
      {ok === "approved" && <Notice>Ish chop etildi, muallifga xabar yuborildi.</Notice>}
      {ok === "rejected" && <Notice>Ish rad etildi, muallifga xabar yuborildi.</Notice>}

      {pending.length > 0 && (
        <section className="adm-pending" aria-labelledby="h-pending">
          <h2 className="adm-h2" id="h-pending">Koʻrib chiqish kutilmoqda · {pending.length}</h2>
          <ul className="adm-works">
            {pending.map((w) => (
              <li key={w.id} className="adm-card">
                <Link href={`/admin/works/${w.id}`} className="adm-work-cover" aria-label={`${w.title} — koʻrish`}>
                  {w.coverImage ? <img src={w.coverImage} alt="" loading="lazy" /> : <IconImage />}
                </Link>
                <div className="adm-work-body">
                  <div className="adm-tags">
                    <span className="tag tag-warn">Aʼzo ishi · kutilmoqda</span>
                    <span className="tag">{splitLines(w.images).length} ta rasm</span>
                  </div>
                  <Link href={`/admin/works/${w.id}`} className="adm-work-title">{w.title}</Link>
                  <span className="adm-meta">
                    {w.authorName}
                    {w.submittedById ? <> · <Link href={`/admin/users/${w.submittedById}`} className="link">foydalanuvchi #{w.submittedById}</Link></> : null}
                    {" · "}{formatDate(w.createdAt)}
                  </span>
                  {w.summary && <p className="adm-text" style={{ margin: "4px 0 0" }}>{w.summary}</p>}
                  <div className="adm-work-actions">
                    <Link href={`/admin/works/${w.id}`} className="chip">Koʻrish va tahrirlash</Link>
                    <form action={approveWorkAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <button className="chip chip-ok">Tasdiqlash va chop etish</button>
                    </form>
                    <form action={rejectWorkAction} className="adm-reject">
                      <input type="hidden" name="id" value={w.id} />
                      <input type="text" name="reason" maxLength={300} placeholder="Sabab (muallifga koʻrinadi)" aria-label={`“${w.title}” rad etish sababi`} />
                      <ConfirmButton className="chip chip-danger" message={`“${w.title}” rad etilsinmi? Muallifga xabar boradi.`}>Rad etish</ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {works.length === 0 ? (
        <div className="adm-card adm-pad adm-blank">
          <IconImage />
          <h2>Birinchi ishingizni qoʻshing</h2>
          <p className="muted">Rasmlarni yuklang, qaysi shriftlar ishlatilganini belgilang — ish “Dizaynerlar” sahifasida va shrift sahifalarida chiqadi.</p>
          <Link href="/admin/works/new" className="btn btn-accent btn-sm">+ Yangi ish</Link>
        </div>
      ) : rest.length === 0 ? null : (
        <ul className="adm-works">
          {rest.map((w) => {
            const n = splitLines(w.images).length;
            return (
              <li key={w.id} className="adm-card">
                <Link href={`/admin/works/${w.id}`} className="adm-work-cover" aria-label={`${w.title} — tahrirlash`}>
                  {w.coverImage ? <img src={w.coverImage} alt="" loading="lazy" /> : <IconImage />}
                </Link>
                <div className="adm-work-body">
                  <div className="adm-tags">
                    <span className={w.kind === "own" ? "tag" : "tag tag-warn"}>{KIND_LABEL[w.kind] ?? w.kind}</span>
                    {w.isPublished ? <span className="tag tag-ok">Saytda</span> : w.status === "rejected" ? <span className="tag tag-danger">Rad etilgan</span> : <span className="tag tag-off">Qoralama</span>}
                    {w.isFeatured && <span className="tag tag-new">Tanlangan</span>}
                  </div>
                  <Link href={`/admin/works/${w.id}`} className="adm-work-title">{w.title}</Link>
                  <span className="adm-meta">
                    {[w.authorName, w.client, w.year, `${n} ta rasm`].filter(Boolean).join(" · ")} · {formatDate(w.updatedAt)}
                  </span>
                  <div className="adm-work-actions">
                    <Link href={`/admin/works/${w.id}`} className="chip">Tahrirlash</Link>
                    <form action={toggleWorkAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="field" value="isPublished" />
                      <button className="chip">{w.isPublished ? "Yashirish" : "Chop etish"}</button>
                    </form>
                    <form action={toggleWorkAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="field" value="isFeatured" />
                      <button className="chip">{w.isFeatured ? "Tanlanganlardan olish" : "Tanlangan qilish"}</button>
                    </form>
                    <form action={deleteWorkAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <ConfirmButton className="chip chip-danger" message={`“${w.title}” oʻchirilsinmi? Rasmlar “Rasmlar” boʻlimida qoladi.`}>Oʻchirish</ConfirmButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
