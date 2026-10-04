import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { sendNotificationAction, deleteNotificationBatchAction } from "@/app/admin/userActions";
import Notice from "@/components/admin/Notice";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata = { title: "Admin — Bildirishnomalar" };

const DAY = 24 * 60 * 60 * 1000;
const ERR: Record<string, string> = {
  title: "Xabar sarlavhasi boʻsh boʻlmasin.",
  link: "Havola “/” bilan boshlanishi yoki https:// manzil boʻlishi kerak.",
  empty: "Tanlangan auditoriyada hech kim yoʻq.",
};

export default async function NotificationsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; n?: string; error?: string }> }) {
  const sp = await searchParams;
  const [all, active, batches] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    // One row per sent message: recipients and how many have opened it.
    db.$queryRaw<{ batch: string; title: string; body: string; link: string | null; sent: Date; recipients: number; read: number }[]>`
      SELECT "batch", MIN("title") AS title, MIN("body") AS body, MIN("link") AS link, MIN("createdAt") AS sent,
             COUNT(*)::int AS recipients, COUNT("readAt")::int AS read
      FROM "Notification" GROUP BY "batch" ORDER BY sent DESC LIMIT 50`,
  ]);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Bildirishnomalar</h1>
          <p className="adm-sub">Foydalanuvchilar xabarni saytdagi qoʻngʻiroqcha belgisi orqali koʻradi.</p>
        </div>
      </div>
      {sp.ok === "sent" && <Notice>Xabar {formatNumber(Number(sp.n) || 0)} kishiga yuborildi.</Notice>}
      {sp.error && <Notice tone="error">{ERR[sp.error] ?? "Xatolik yuz berdi."}</Notice>}

      <section className="adm-card adm-pad">
        <h2 className="adm-h2">Yangi xabar</h2>
        <form action={sendNotificationAction} className="adm-compose">
          <fieldset className="adm-periods">
            <legend className="adm-legend">Kimga</legend>
            <label className="adm-radio"><input type="radio" name="audience" value="all" defaultChecked /><span>Barcha foydalanuvchilar · {formatNumber(all)}</span></label>
            <label className="adm-radio"><input type="radio" name="audience" value="active" /><span>Soʻnggi 30 kunda kirganlar · {formatNumber(active)}</span></label>
          </fieldset>
          <div className="field">
            <label htmlFor="b-title">Sarlavha</label>
            <input id="b-title" type="text" name="title" maxLength={140} required placeholder="masalan: 12 ta yangi kirill shrift" />
          </div>
          <div className="field">
            <label htmlFor="b-body">Matn</label>
            <textarea id="b-body" name="body" maxLength={2000} rows={4} />
          </div>
          <div className="field">
            <label htmlFor="b-link">Havola (ixtiyoriy)</label>
            <input id="b-link" type="text" name="link" placeholder="/portfolio yoki https://…" />
          </div>
          <ConfirmButton className="btn btn-accent btn-sm" message="Xabar tanlangan barcha foydalanuvchilarga yuborilsinmi?">Yuborish</ConfirmButton>
        </form>
      </section>

      <h2 className="adm-h2" style={{ marginTop: 34 }}>Yuborilganlar</h2>
      <div className="adm-card">
        <table className="adm-table">
          <thead><tr><th>Xabar</th><th>Yuborilgan</th><th>Qabul qiluvchi</th><th>Oʻqilgan</th><th><span className="sr-only">Amallar</span></th></tr></thead>
          <tbody>
            {batches.map((b) => {
              const pct = b.recipients ? Math.round((b.read / b.recipients) * 100) : 0;
              return (
                <tr key={b.batch}>
                  <td><strong>{b.title}</strong>{b.body && <span className="adm-meta adm-clamp">{b.body}</span>}</td>
                  <td className="nowrap">{formatDateTime(b.sent)}</td>
                  <td>{formatNumber(b.recipients)}</td>
                  <td>
                    <div className="adm-meter" title={`${b.read} / ${b.recipients}`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <span className="adm-meta">{pct}% · {formatNumber(b.read)}</span>
                  </td>
                  <td className="adm-act">
                    <form action={deleteNotificationBatchAction}>
                      <input type="hidden" name="batch" value={b.batch} />
                      <input type="hidden" name="back" value="/admin/notifications" />
                      <ConfirmButton className="chip" message="Xabar barcha qabul qiluvchilardan qaytarib olinsinmi?">Qaytarib olish</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && <tr><td colSpan={5} className="adm-empty">Hali xabar yuborilmagan.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
