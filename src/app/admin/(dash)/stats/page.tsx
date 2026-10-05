import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { PERIODS, getStats, parsePeriod } from "@/lib/statsQueries";
import BarChart from "@/components/admin/BarChart";

export const metadata = { title: "Admin — Statistika" };

const SOURCE_LABEL: Record<string, string> = {
  direct: "Toʻgʻridan-toʻgʻri", referral: "Boshqa saytlar", instagram: "Instagram", telegram: "Telegram", google: "Google",
  facebook: "Facebook", youtube: "YouTube", tiktok: "TikTok", yandex: "Yandex", x: "X (Twitter)", bing: "Bing", behance: "Behance",
};
const DEVICE_LABEL: Record<string, string> = { mobile: "Telefon", desktop: "Kompyuter", tablet: "Planshet" };
const COUNTRY: Record<string, string> = {
  UZ: "Oʻzbekiston", RU: "Rossiya", KZ: "Qozogʻiston", KG: "Qirgʻiziston", TJ: "Tojikiston", TM: "Turkmaniston", TR: "Turkiya",
  US: "AQSh", DE: "Germaniya", GB: "Buyuk Britaniya", UA: "Ukraina", AZ: "Ozarbayjon", KR: "Koreya", AE: "BAA", FR: "Fransiya",
};

const pct = (r: number) => `${(r * 100).toFixed(r > 0 && r < 0.1 ? 1 : 0)}%`;
function dur(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parsePeriod((await searchParams).days);
  const s = await getStats(days);
  const empty = s.kpi.views === 0;
  const top = s.funnel[0]?.n || 0;
  const devTotal = s.devices.reduce((a, d) => a + d.visitors, 0) || 1;
  const maxCountry = Math.max(1, ...s.countries.map((c) => c.visitors));

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Statistika</h1>
          <p className="adm-sub">Anonim va cookie&apos;siz. Raqamlar statistika yoqilgan kundan boshlanadi.</p>
        </div>
        <div className="adm-filters" role="group" aria-label="Davr">
          {PERIODS.map((p) => (
            <Link key={p.days} href={p.days === 7 ? "/admin/stats" : `/admin/stats?days=${p.days}`} className={`chip${p.days === days ? " active" : ""}`} aria-current={p.days === days ? "true" : undefined}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="stats-live" role="status">
        <i className={`dot${s.live ? " on" : ""}`} aria-hidden="true" /> Hozir saytda (oxirgi 30 daqiqa): <b>{formatNumber(s.live)}</b>
      </p>

      <div className="stat-grid">
        <div className="stat"><div className="n">{formatNumber(s.kpi.visitors)}</div><div className="l">Mehmonlar</div></div>
        <div className="stat"><div className="n">{formatNumber(s.kpi.views)}</div><div className="l">Sahifa koʻrishlar</div></div>
        <div className="stat"><div className="n">{s.kpi.pagesPerVisit ? s.kpi.pagesPerVisit.toFixed(1) : "—"}</div><div className="l">Bir tashrifda sahifa</div></div>
        <div className="stat"><div className="n">{s.kpi.avgMs ? dur(s.kpi.avgMs) : "—"}</div><div className="l">Sahifada oʻrtacha vaqt</div></div>
        <div className="stat"><div className="n">{empty ? "—" : pct(s.kpi.bounce)}</div><div className="l">Bitta sahifadan chiqib ketganlar</div></div>
        <div className="stat"><div className="n">{formatNumber(s.kpi.downloads)}</div><div className="l">Yuklab olish bosildi</div></div>
        <div className="stat"><div className="n">{formatNumber(s.kpi.wishes)}</div><div className="l">♡ ga qoʻshildi</div></div>
        <div className="stat"><div className="n">{formatNumber(s.kpi.signups)}</div><div className="l">Roʻyxatdan oʻtdi{s.kpi.visitors ? ` · ${pct(s.kpi.conversion)}` : ""}</div></div>
      </div>

      {empty ? (
        <div className="adm-card adm-pad adm-blank">
          <h2>Hali maʼlumot yoʻq</h2>
          <p className="muted">Birinchi tashriflar kelishi bilan raqamlar shu yerda paydo boʻladi. O&apos;zingizning (admin) kirishlaringiz hisobga olinmaydi.</p>
        </div>
      ) : (
        <>
          <section className="adm-card adm-pad" aria-labelledby="h-chart">
            <h2 className="adm-h2" id="h-chart">{days === 1 ? "Bugun, soatlar boʻyicha" : `Soʻnggi ${days} kun`}</h2>
            <BarChart points={s.points} unit={days === 1 ? "soat" : "kun"} />
            {days > 1 && <p className="adm-meta">Mehmon: har kuni yangidan hisoblanadi (bir kishi ikki kun kirsa, ikki mehmon).</p>}
          </section>

          <section className="adm-card adm-pad" aria-labelledby="h-funnel">
            <h2 className="adm-h2" id="h-funnel">Voronka: kirishdan roʻyxatdan oʻtishgacha</h2>
            <ol className="funnel">
              {s.funnel.map((f, i) => (
                <li key={f.label}>
                  <span className="funnel-label">{f.label}</span>
                  <span className="funnel-bar"><span style={{ width: `${top ? Math.max(f.n ? 1.5 : 0, (f.n / top) * 100) : 0}%` }} /></span>
                  <span className="funnel-n">{formatNumber(f.n)}{i > 0 && top ? <small> · {pct(f.n / top)}</small> : null}</span>
                </li>
              ))}
            </ol>
            <p className="adm-meta">Bir kun ichidagi harakatlar bo&apos;yicha: kishi bugun kirib, ertaga roʻyxatdan oʻtsa, ikki xil kun hisoblanadi.</p>
          </section>

          <section className="adm-card" aria-labelledby="h-sources">
            <h2 className="adm-h2 adm-pad-top" id="h-sources">Manbalar: odamlar qayerdan keladi va qoladimi</h2>
            <table className="adm-table">
              <thead><tr><th>Manba</th><th>Mehmon</th><th>Sahifa / tashrif</th><th>Oʻrtacha vaqt</th><th>Yuklab olish</th><th>Roʻyxatdan oʻtdi</th><th>Konversiya</th></tr></thead>
              <tbody>
                {s.sources.map((r) => (
                  <tr key={r.source}>
                    <td><strong>{SOURCE_LABEL[r.source] ?? r.source}</strong></td>
                    <td>{formatNumber(r.visitors)}</td>
                    <td>{r.pagesPerVisit ? r.pagesPerVisit.toFixed(1) : "—"}</td>
                    <td>{r.avgMs ? dur(r.avgMs) : "—"}</td>
                    <td>{formatNumber(r.downloads)}</td>
                    <td>{formatNumber(r.signups)}</td>
                    <td>{r.visitors ? pct(r.signups / r.visitors) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="adm-meta adm-pad-x">Instagram biosiga havolani <code>?utm_source=instagram</code> bilan qoʻying: ba&apos;zan Instagram manbani yashiradi va mehmon “toʻgʻridan-toʻgʻri” boʻlib qoladi.</p>
          </section>

          <div className="adm-cols">
            <section className="adm-card" aria-labelledby="h-pages">
              <h2 className="adm-h2 adm-pad-top" id="h-pages">Eng koʻp koʻrilgan sahifalar</h2>
              <table className="adm-table">
                <thead><tr><th>Sahifa</th><th>Koʻrish</th><th>Mehmon</th><th>Vaqt</th></tr></thead>
                <tbody>
                  {s.pages.map((p) => (
                    <tr key={p.path}>
                      <td className="adm-path">{p.path}</td><td>{formatNumber(p.views)}</td><td>{formatNumber(p.visitors)}</td><td>{p.avgMs ? dur(p.avgMs) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="adm-card" aria-labelledby="h-fonts">
              <h2 className="adm-h2 adm-pad-top" id="h-fonts">Eng koʻp koʻrilgan shriftlar</h2>
              <table className="adm-table">
                <thead><tr><th>Shrift</th><th>Koʻrish</th><th>Yuklash</th><th>♡</th></tr></thead>
                <tbody>
                  {s.fonts.map((f) => (
                    <tr key={f.slug}>
                      <td><Link href={`/fonts/${f.slug}`} target="_blank" className="link">{f.name}</Link></td>
                      <td>{formatNumber(f.views)}</td><td>{formatNumber(f.downloads)}</td><td>{formatNumber(f.wishes)}</td>
                    </tr>
                  ))}
                  {s.fonts.length === 0 && <tr><td colSpan={4} className="adm-empty">Hali shrift sahifalari koʻrilmagan.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          <div className="adm-cols adm-cols-3">
            <section className="adm-card adm-pad" aria-labelledby="h-dev">
              <h2 className="adm-h2" id="h-dev">Qurilmalar</h2>
              <ul className="meter-list">
                {s.devices.map((d) => (
                  <li key={d.device}><span>{DEVICE_LABEL[d.device] ?? d.device}</span><span className="adm-meter"><span style={{ width: `${(d.visitors / devTotal) * 100}%` }} /></span><b>{pct(d.visitors / devTotal)}</b></li>
                ))}
              </ul>
            </section>
            <section className="adm-card adm-pad" aria-labelledby="h-ctry">
              <h2 className="adm-h2" id="h-ctry">Mamlakatlar</h2>
              <ul className="meter-list">
                {s.countries.map((c) => (
                  <li key={c.country ?? "?"}><span>{c.country ? COUNTRY[c.country] ?? c.country : "Nomaʼlum"}</span><span className="adm-meter"><span style={{ width: `${(c.visitors / maxCountry) * 100}%` }} /></span><b>{formatNumber(c.visitors)}</b></li>
                ))}
              </ul>
            </section>
            <section className="adm-card adm-pad" aria-labelledby="h-ref">
              <h2 className="adm-h2" id="h-ref">Havola bergan saytlar</h2>
              {s.referrals.length ? (
                <ul className="meter-list is-plain">
                  {s.referrals.map((r) => <li key={r.ref}><span className="adm-path">{r.ref}</span><b>{formatNumber(r.visitors)}</b></li>)}
                </ul>
              ) : <p className="muted adm-text">Hozircha yoʻq.</p>}
            </section>
          </div>
        </>
      )}
    </>
  );
}
