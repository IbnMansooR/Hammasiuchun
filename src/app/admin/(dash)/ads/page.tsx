import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { PLACEMENTS } from "@/lib/ads";
import { deleteAdAction, toggleAdAction } from "@/app/admin/adActions";
import Notice from "@/components/admin/Notice";
import ConfirmButton from "@/components/ConfirmButton";
import { IconImage } from "@/components/Icons";

export const metadata = { title: "Admin — Reklama" };

const placementLabel = (k: string) => PLACEMENTS.find((p) => p.key === k)?.label ?? k;

function state(a: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()): { label: string; cls: string } {
  if (!a.isActive) return { label: "Oʻchirilgan", cls: "tag tag-off" };
  if (a.endsAt && a.endsAt <= now) return { label: "Tugagan", cls: "tag tag-off" };
  if (a.startsAt && a.startsAt > now) return { label: "Kutilmoqda", cls: "tag tag-warn" };
  return { label: "Saytda", cls: "tag tag-ok" };
}

export default async function AdsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const [ads, counts] = await Promise.all([
    db.ad.findMany({ orderBy: [{ isActive: "desc" }, { placement: "asc" }, { sortOrder: "asc" }, { id: "desc" }] }),
    // Views and clicks of the last 30 days, per banner (meta = the banner's id).
    db.$queryRaw<{ meta: string; name: string; n: number }[]>`
      SELECT meta, name, COUNT(*)::int AS n FROM "Hit"
      WHERE name IN ('ad_view', 'ad_click') AND meta IS NOT NULL AND "at" >= now() - interval '30 days'
      GROUP BY meta, name`,
  ]);
  const n = (id: number, name: string) => counts.find((c) => c.meta === String(id) && c.name === name)?.n ?? 0;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Reklama</h1>
          <p className="adm-sub">“Reklama” deb belgilangan banner joylari. Koʻrishlar va bosishlar oxirgi 30 kun uchun.</p>
        </div>
        <Link href="/admin/ads/new" className="btn btn-accent btn-sm">+ Yangi banner</Link>
      </div>
      {ok === "saved" && <Notice>Saqlandi.</Notice>}
      {ok === "deleted" && <Notice>Banner oʻchirildi.</Notice>}

      {ads.length === 0 ? (
        <div className="adm-card adm-pad adm-blank">
          <IconImage />
          <h2>Hali banner yoʻq</h2>
          <p className="muted">Banner qoʻshing va u bosh sahifada yoki Dizaynerlar sahifasida “Reklama” belgisi bilan chiqadi. Har bir banner uchun koʻrishlar va bosishlar hisoblanadi: reklama beruvchiga ko‘rsatish uchun.</p>
          <Link href="/admin/ads/new" className="btn btn-accent btn-sm">+ Yangi banner</Link>
        </div>
      ) : (
        <div className="adm-card">
          <table className="adm-table">
            <thead>
              <tr><th>Banner</th><th>Joy</th><th>Muddat</th><th>Holat</th><th>Koʻrish</th><th>Bosish</th><th>CTR</th><th><span className="sr-only">Amallar</span></th></tr>
            </thead>
            <tbody>
              {ads.map((a) => {
                const views = n(a.id, "ad_view");
                const clicks = n(a.id, "ad_click");
                const st = state(a);
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/admin/ads/${a.id}`} className="adm-ad-cell">
                        <img src={a.image} alt="" loading="lazy" />
                        <span><strong>{a.title}</strong>{a.advertiser && <span className="adm-meta">{a.advertiser}</span>}</span>
                      </Link>
                    </td>
                    <td>{placementLabel(a.placement)}</td>
                    <td className="nowrap">
                      {a.startsAt || a.endsAt ? <>{a.startsAt ? formatDateTime(a.startsAt) : "…"}<br />{a.endsAt ? formatDateTime(a.endsAt) : "…"}</> : <span className="muted">Cheklovsiz</span>}
                    </td>
                    <td><span className={st.cls}>{st.label}</span></td>
                    <td>{formatNumber(views)}</td>
                    <td>{formatNumber(clicks)}</td>
                    <td>{views ? `${((clicks / views) * 100).toFixed(1)}%` : "—"}</td>
                    <td className="adm-act">
                     <div className="adm-act-wrap">
                      <Link href={`/admin/ads/${a.id}`} className="chip">Tahrirlash</Link>
                      <form action={toggleAdAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="chip">{a.isActive ? "Oʻchirib qoʻyish" : "Yoqish"}</button>
                      </form>
                      <form action={deleteAdAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmButton className="chip chip-danger" message={`“${a.title}” bannerini oʻchirasizmi? Statistikasi saqlanadi.`}>Oʻchirish</ConfirmButton>
                      </form>
                     </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="adm-meta" style={{ marginTop: 14 }}>Koʻrish: banner ekranning yarmidan koʻpi bir soniya koʻringanda sanaladi. Siz (admin) koʻrganingiz sanalmaydi.</p>
    </>
  );
}
