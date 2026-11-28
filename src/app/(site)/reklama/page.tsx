import type { Metadata } from "next";
import { getAdOffer, getAudience, AD_PLACES } from "@/lib/adSales";
import { botUsername } from "@/lib/telegram";
import { formatNumber } from "@/lib/format";
import { DOWNLOADS_SHOWN_FROM } from "@/lib/stats";
import { alternates, getLocale } from "@/i18n/server";
import { DICTS } from "@/i18n/dict";
import SubmitButton from "@/components/SubmitButton";
import { sendAdRequestAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTS[await getLocale()].adsPage;
  return { title: t.metaTitle, description: t.metaDesc, alternates: await alternates("/reklama") };
}

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const [{ sent, error }, locale, offer, aud] = await Promise.all([searchParams, getLocale(), getAdOffer(), getAudience().catch(() => null)]);
  const t = DICTS[locale].adsPage;
  const bot = botUsername();
  const sentId = Number(sent);
  // Only numbers worth showing, and the download total only once it is past the public threshold.
  const stats = [
    aud?.visits ? [formatNumber(aud.visits), t.visits] : null,
    aud?.views ? [formatNumber(aud.views), t.views] : null,
    aud?.subscribers ? [formatNumber(aud.subscribers), t.subscribers] : null,
    aud?.fonts ? [formatNumber(aud.fonts), t.fonts] : null,
    aud && aud.downloads >= DOWNLOADS_SHOWN_FROM ? [formatNumber(aud.downloads), t.downloads] : null,
  ].filter((x): x is [string, string] => !!x);
  const formats = [
    { title: t.channelTitle, text: t.channelText, price: offer.channelPrice },
    { title: t.siteTitle, text: t.siteText, price: offer.sitePrice },
    { title: t.packageTitle, text: t.packageText, price: offer.packagePrice },
  ];

  return (
    <div className="container ads-page">
      <header className="page-head narrow">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      {stats.length > 0 && (
        <section aria-labelledby="ads-aud">
          <div className="section-head"><h2 id="ads-aud">{t.audience}</h2></div>
          <dl className="ads-stats">
            {stats.map(([n, label]) => (
              <div key={label}><dt>{label}</dt><dd>{n}</dd></div>
            ))}
          </dl>
          <p className="muted ads-note">{t.audienceNote}</p>
        </section>
      )}

      <section aria-labelledby="ads-formats">
        <div className="section-head"><h2 id="ads-formats">{t.formats}</h2></div>
        <div className="ads-formats">
          {formats.map((f) => (
            <article key={f.title} className="ads-format">
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <p className="ads-price">{f.price || t.priceAsk}</p>
            </article>
          ))}
        </div>
        {offer.note && <p className="muted ads-note">{offer.note}</p>}
      </section>

      <section className="ads-two" aria-label={`${t.reportTitle}, ${t.rulesTitle}`}>
        <div>
          <h2>{t.reportTitle}</h2>
          <p>{t.reportText}</p>
        </div>
        <div>
          <h2>{t.rulesTitle}</h2>
          <ul>{t.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>

      <section id="ariza" className="ads-form-wrap" aria-labelledby="ads-form-h">
        <h2 id="ads-form-h">{t.formTitle}</h2>
        <p className="muted">{t.formLead}</p>
        {bot && (
          <a className="btn btn-sm" href={`https://t.me/${bot}?start=reklama`} target="_blank" rel="noopener">{t.viaBot} ↗</a>
        )}
        {sentId > 0 && <div className="alert alert-ok" role="status">{t.sent(sentId)}</div>}
        {error && t.errors[error] && <div className="alert alert-error" role="alert">{t.errors[error]}</div>}
        {!(sentId > 0) && (
          <form action={sendAdRequestAction} className="ads-form">
            <div className="field-row">
              <div className="field">
                <label htmlFor="ad-name">{t.name}</label>
                <input id="ad-name" name="name" required maxLength={80} autoComplete="organization" />
              </div>
              <div className="field">
                <label htmlFor="ad-contact">{t.contact}</label>
                <input id="ad-contact" name="contact" required maxLength={120} autoComplete="tel" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="ad-what">{t.what}</label>
              <textarea id="ad-what" name="what" rows={3} required maxLength={1000} aria-describedby="ad-what-hint" />
              <span id="ad-what-hint" className="hint">{t.whatHint}</span>
            </div>
            <fieldset className="field ads-places">
              <legend>{t.where}</legend>
              {AD_PLACES.map((p, i) => (
                <label key={p} className="check"><input type="radio" name="place" value={p} defaultChecked={i === 0} /> {t.places[p]}</label>
              ))}
            </fieldset>
            <div className="field-row">
              <div className="field">
                <label htmlFor="ad-timing">{t.timing}</label>
                <input id="ad-timing" name="timing" maxLength={300} />
              </div>
              <div className="field">
                <label htmlFor="ad-link">{t.link}</label>
                <input id="ad-link" name="link" maxLength={300} inputMode="url" />
              </div>
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="ad-website">Website</label>
              <input id="ad-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <SubmitButton className="btn btn-accent btn-lg" pendingLabel={t.sending}>{t.send}</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
