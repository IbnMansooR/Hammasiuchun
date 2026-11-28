import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AD_PLACE_LABEL, AD_STATUS, AD_STATUS_LABEL, type AdPlace } from "@/lib/adSales";
import { saveAdRequestAction } from "@/app/admin/adActions";
import AdsTabs from "@/components/admin/AdsTabs";
import Notice from "@/components/admin/Notice";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Admin — Reklama arizalari" };

const FILTERS = [
  { key: "open", label: "Ochiq" },
  { key: "all", label: "Hammasi" },
] as const;

const contactHref = (c: string) =>
  /^@[A-Za-z0-9_]{4,}$/.test(c) ? `https://t.me/${c.slice(1)}` : /^\+?[\d\s()-]{7,}$/.test(c) ? `tel:${c.replace(/[^\d+]/g, "")}` : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? `mailto:${c}` : null;

export default async function AdRequestsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; f?: string }> }) {
  const { ok, f = "open" } = await searchParams;
  const rows = await db.adRequest.findMany({
    where: f === "all" ? {} : { status: { in: ["new", "contacted", "accepted"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Reklama</h1>
          <p className="adm-sub">Saytdagi “Reklama berish” formasi va botdagi /reklama orqali kelgan arizalar. Har biri Telegramingizga ham keladi.</p>
        </div>
        <a href="/reklama" target="_blank" rel="noopener" className="btn btn-sm">Ariza sahifasi ↗</a>
      </div>
      <AdsTabs current="/admin/ads/requests" />
      {ok === "saved" && <Notice>Saqlandi.</Notice>}
      <div className="adm-toolbar">
        <div className="adm-filters" role="group" aria-label="Holat boʻyicha">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/admin/ads/requests?f=${x.key}`} className={`chip${f === x.key ? " active" : ""}`} aria-current={f === x.key ? "true" : undefined}>{x.label}</Link>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="adm-card adm-pad"><p className="adm-text">Hozircha ariza yoʻq. Ariza sahifasi: <a className="link" href="/reklama">feekrfont.uz/reklama</a>, botda: /reklama.</p></div>
      ) : (
        <ul className="adm-req-list">
          {rows.map((r) => {
            const write = r.tgUsername ? `https://t.me/${r.tgUsername}` : contactHref(r.contact);
            return (
              <li key={r.id} id={`r${r.id}`} className="adm-req">
                <div className="adm-req-head">
                  <strong>#{r.id} · {r.name}</strong>
                  <span>
                    <span className={`tag ${r.status === "new" ? "tag-warn" : r.status === "rejected" ? "tag-off" : "tag-ok"}`}>{AD_STATUS_LABEL[r.status] ?? r.status}</span>
                    <span className="adm-meta"> {r.source === "bot" ? "bot" : "sayt"} · {formatDateTime(r.createdAt)}</span>
                  </span>
                </div>
                <dl className="adm-dl">
                  <div><dt>Aloqa</dt><dd>{write ? <a className="link" href={write} target="_blank" rel="noopener">{r.contact}</a> : r.contact}{r.tgUsername && r.contact !== `@${r.tgUsername}` ? ` · @${r.tgUsername}` : ""}</dd></div>
                  <div><dt>Nima</dt><dd className="adm-ad-text">{r.what}</dd></div>
                  <div><dt>Qayerda</dt><dd>{AD_PLACE_LABEL[r.placements as AdPlace] ?? r.placements}</dd></div>
                  {r.timing && <div><dt>Muddat / byudjet</dt><dd>{r.timing}</dd></div>}
                  {r.link && <div><dt>Havola</dt><dd className="adm-ad-text">{r.link}</dd></div>}
                </dl>
                <form action={saveAdRequestAction} className="adm-req-form">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="sr-only" htmlFor={`st${r.id}`}>Holat</label>
                  <select id={`st${r.id}`} name="status" className="sel" defaultValue={r.status}>
                    {AD_STATUS.map((s) => <option key={s} value={s}>{AD_STATUS_LABEL[s]}</option>)}
                  </select>
                  <label className="sr-only" htmlFor={`nt${r.id}`}>Eslatma</label>
                  <input id={`nt${r.id}`} type="text" name="note" defaultValue={r.note ?? ""} placeholder="Eslatma (faqat sizga)" maxLength={1000} />
                  <SubmitButton className="btn btn-sm" pendingLabel="…">Saqlash</SubmitButton>
                  {r.placements !== "site" && r.status !== "rejected" && (
                    <Link href={`/admin/ads/channel/new?request=${r.id}`} className="btn btn-accent btn-sm">Kanal posti yaratish</Link>
                  )}
                </form>
              </li>
            );
          })}
        </ul>
      )}
      <p className="adm-meta" style={{ marginTop: 14 }}>“Qabul qilindi” yoki “Rad etildi” tanlansa, botdan yozgan arizachiga xabar boradi.</p>
    </>
  );
}
