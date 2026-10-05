import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { activeRestriction } from "@/lib/userAuth";
import { statusOf, signInMethods, displayName } from "@/lib/userStatus";
import {
  restrictUserAction, liftRestrictionAction, deleteUserAction, sendNotificationAction, deleteNotificationBatchAction,
} from "@/app/admin/userActions";
import Notice from "@/components/admin/Notice";
import ConfirmButton from "@/components/ConfirmButton";
import SubmitButton from "@/components/SubmitButton";
import { IconChevron } from "@/components/Icons";

export const metadata = { title: "Admin — Foydalanuvchi" };

const OK: Record<string, string> = {
  blocked: "Foydalanuvchi bloklandi. U endi hisobiga kira olmaydi.",
  suspended: "Foydalanuvchi vaqtincha cheklandi.",
  lifted: "Cheklov olib tashlandi.",
};
const ERR: Record<string, string> = {
  until: "Cheklov muddati notoʻgʻri — kelajakdagi sana tanlang.",
  title: "Xabar sarlavhasi boʻsh boʻlmasin.",
  link: "Havola “/” bilan boshlanishi yoki https:// manzil boʻlishi kerak.",
};
const PERIODS = [
  { v: "1", l: "1 kun" }, { v: "3", l: "3 kun" }, { v: "7", l: "7 kun" }, { v: "30", l: "30 kun" },
  { v: "forever", l: "Muddatsiz (blok)" }, { v: "custom", l: "Sana boʻyicha…" },
];

export default async function UserPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; n?: string }>;
}) {
  const { id: raw } = await params;
  const sp = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const user = await db.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true, purchases: true, notifications: true } },
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();

  const st = statusOf(user);
  const r = activeRestriction(user);
  const name = displayName(user);
  const unread = user.notifications.filter((n) => !n.readAt).length;
  const back = `/admin/users/${id}`;

  return (
    <>
      <nav className="crumbs" aria-label="Yoʻl" style={{ paddingTop: 0, marginBottom: 14 }}>
        <Link href="/admin/users">Foydalanuvchilar</Link>
        <IconChevron />
        <span>{name}</span>
      </nav>
      <div className="adm-head">
        <div className="adm-user adm-user-lg">
          <span className="adm-avatar" aria-hidden="true">{name.replace(/^\+/, "").charAt(0).toUpperCase()}</span>
          <span>
            <h1>{name}</h1>
            <span className="adm-meta">ID {user.id} · {formatDate(user.createdAt)} da roʻyxatdan oʻtgan</span>
          </span>
        </div>
        <span className={st.cls} style={{ fontSize: 13, height: 28, padding: "0 12px" }}>{st.label}</span>
      </div>

      {sp.ok && OK[sp.ok] && <Notice>{OK[sp.ok]}</Notice>}
      {sp.ok === "sent" && <Notice>Xabar yuborildi.</Notice>}
      {sp.error && <Notice tone="error">{ERR[sp.error] ?? "Xatolik yuz berdi."}</Notice>}

      <div className="adm-cols">
        <section className="adm-card adm-pad">
          <h2 className="adm-h2">Maʼlumotlar</h2>
          <dl className="adm-dl">
            <div><dt>Ism</dt><dd>{user.name || <span className="muted">—</span>}</dd></div>
            <div><dt>Email</dt><dd>{user.email || <span className="muted">—</span>}</dd></div>
            <div><dt>Telefon</dt><dd>{user.phone ? `+${user.phone}` : <span className="muted">—</span>}</dd></div>
            <div><dt>Kirish usuli</dt><dd><div className="adm-tags">{signInMethods(user).map((m) => <span key={m} className="tag">{m}</span>)}</div></dd></div>
            <div><dt>Oxirgi kirish</dt><dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <span className="muted">Maʼlumot yoʻq</span>}</dd></div>
            <div><dt>Buyurtmalar</dt><dd>{user._count.orders}</dd></div>
            <div><dt>Bildirishnomalar</dt><dd>{user._count.notifications}{unread ? ` (${unread} ta oʻqilmagan)` : ""}</dd></div>
          </dl>
        </section>

        <section className="adm-card adm-pad">
          <h2 className="adm-h2">Cheklov</h2>
          {r ? (
            <>
              <p className="adm-text">
                {r.until ? <>Hisob <b>{formatDateTime(r.until)}</b> gacha cheklangan.</> : <>Hisob muddatsiz bloklangan.</>}
                {user.blockedAt && <> Qoʻyilgan: {formatDateTime(user.blockedAt)}.</>}
              </p>
              {r.reason && <p className="adm-text"><span className="muted">Sabab:</span> {r.reason}</p>}
              <form action={liftRestrictionAction}>
                <input type="hidden" name="id" value={user.id} />
                <label className="check" style={{ margin: "4px 0 14px" }}>
                  <input type="checkbox" name="notify" defaultChecked /> Foydalanuvchiga xabar yuborish
                </label>
                <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Olib tashlanmoqda…">Cheklovni olib tashlash</SubmitButton>
              </form>
            </>
          ) : (
            <form action={restrictUserAction}>
              <input type="hidden" name="id" value={user.id} />
              <fieldset className="adm-periods">
                <legend className="sr-only">Muddat</legend>
                {PERIODS.map((p, i) => (
                  <label key={p.v} className="adm-radio">
                    <input type="radio" name="period" value={p.v} defaultChecked={i === 2} />
                    <span>{p.l}</span>
                  </label>
                ))}
              </fieldset>
              <div className="field adm-until">
                <label htmlFor="until">Qachongacha (Toshkent vaqti) — “Sana boʻyicha” uchun</label>
                <input id="until" type="datetime-local" name="until" />
              </div>
              <div className="field">
                <label htmlFor="reason">Sabab (ichki eslatma)</label>
                <input id="reason" type="text" name="reason" maxLength={300} placeholder="masalan: spam" />
              </div>
              <ConfirmButton className="btn btn-danger btn-sm" message={`${name} cheklansinmi? U hisobiga kira olmaydi.`}>
                Cheklash
              </ConfirmButton>
            </form>
          )}
        </section>
      </div>

      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Xabar yuborish</h2>
        <form action={sendNotificationAction} className="adm-compose">
          <input type="hidden" name="audience" value="user" />
          <input type="hidden" name="id" value={user.id} />
          <div className="field">
            <label htmlFor="n-title">Sarlavha</label>
            <input id="n-title" type="text" name="title" maxLength={140} required placeholder="masalan: Yangi shriftlar qoʻshildi" />
          </div>
          <div className="field">
            <label htmlFor="n-body">Matn</label>
            <textarea id="n-body" name="body" maxLength={2000} rows={3} />
          </div>
          <div className="field">
            <label htmlFor="n-link">Havola (ixtiyoriy)</label>
            <input id="n-link" type="text" name="link" placeholder="/fonts/montserrat yoki https://…" />
          </div>
          <SubmitButton className="btn btn-accent btn-sm" pendingLabel="Yuborilmoqda…">Yuborish</SubmitButton>
        </form>
        {user.notifications.length > 0 && (
          <table className="adm-table" style={{ marginTop: 22 }}>
            <thead><tr><th>Xabar</th><th>Yuborilgan</th><th>Holat</th><th><span className="sr-only">Amallar</span></th></tr></thead>
            <tbody>
              {user.notifications.map((n) => (
                <tr key={n.id}>
                  <td><strong>{n.title}</strong>{n.body && <span className="adm-meta adm-clamp">{n.body}</span>}</td>
                  <td className="nowrap">{formatDateTime(n.createdAt)}</td>
                  <td>{n.readAt ? <span className="tag tag-ok">Oʻqilgan</span> : <span className="tag">Oʻqilmagan</span>}</td>
                  <td className="adm-act">
                    <form action={deleteNotificationBatchAction}>
                      <input type="hidden" name="batch" value={n.batch} />
                      <input type="hidden" name="back" value={back} />
                      <ConfirmButton className="chip" message="Bu xabar qaytarib olinsinmi? U barcha qabul qiluvchilardan oʻchadi.">Qaytarib olish</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="adm-card adm-pad adm-danger-zone">
        <div>
          <h2 className="adm-h2">Hisobni oʻchirish</h2>
          <p className="adm-text muted">Hisob va uning bildirishnomalari butunlay oʻchadi; buyurtmalar tarixi saqlanadi.</p>
        </div>
        <form action={deleteUserAction}>
          <input type="hidden" name="id" value={user.id} />
          <ConfirmButton className="btn btn-danger btn-sm" message={`${name} hisobi butunlay oʻchirilsinmi? Bu amalni qaytarib boʻlmaydi.`}>
            Oʻchirish
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
