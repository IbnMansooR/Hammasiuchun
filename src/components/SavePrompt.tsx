"use client";
import Link from "./LLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/trackClient";
import { OFFER_EVENT, type OfferKind } from "@/lib/savePrompt";
import { IconBell, IconClose, IconHeart } from "./Icons";
import { useT } from "@/i18n/client";
import { stripLocale } from "@/i18n/config";

const KEY = "feekr_sp";
const DAY = 24 * 60 * 60 * 1000;
const QUIET_DAYS = 14;
// Pages where an offer would be noise: the visitor is already on the way in.
const QUIET = /^\/(login|register|forgot|reset|account|maxfiylik|admin)(\/|$)/;

type St = { shown?: number; until?: number };
const read = (): St => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const write = (s: St) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

/** A small, dismissible offer shown to signed-out visitors at the two moments it is worth something:
 * after a second ♡ and after a download. At most once a day; "no thanks" silences it for two weeks.
 * It never covers the page and never takes focus. */
export default function SavePrompt() {
  const pathname = stripLocale(usePathname() ?? "/").path;
  const t = useT().prompt;
  const [offer, setOffer] = useState<{ kind: OfferKind; n?: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onOffer = (e: Event) => {
      const d = (e as CustomEvent<{ kind: OfferKind; n?: number }>).detail;
      if (!d || QUIET.test(stripLocale(location.pathname).path)) return;
      const st = read();
      const now = Date.now();
      if ((st.until && now < st.until) || (st.shown && now - st.shown < DAY)) return;
      write({ ...st, shown: now });
      trackEvent("prompt_show", d.kind);
      setOffer(d);
    };
    window.addEventListener(OFFER_EVENT, onOffer);
    return () => window.removeEventListener(OFFER_EVENT, onOffer);
  }, []);

  // Leaving for a "quiet" page, or Escape, closes it.
  useEffect(() => { if (QUIET.test(pathname)) setOffer(null); }, [pathname]);
  useEffect(() => {
    if (!offer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  function silence() { write({ ...read(), until: Date.now() + QUIET_DAYS * DAY }); }
  function dismiss() {
    if (offer) trackEvent("prompt_dismiss", offer.kind);
    silence();
    setOffer(null);
  }
  function accept() {
    if (offer) trackEvent("prompt_click", offer.kind);
    silence();
    setOffer(null);
  }

  if (!offer) return null;
  const wish = offer.kind === "wish";
  return (
    <div className="sp" role="status" aria-live="polite" aria-label={wish ? t.wishLabel : t.newsLabel}>
      <span className="sp-ico" aria-hidden="true">{wish ? <IconHeart /> : <IconBell />}</span>
      <div className="sp-body">
        <b>{wish ? t.wishTitle : t.newsTitle}</b>
        <p>{wish ? t.wishText(offer.n ?? 2) : t.newsText}</p>
        <div className="sp-actions">
          <Link href="/register" className="btn btn-primary btn-sm" onClick={accept}>{wish ? t.wishCta : t.newsCta}</Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>{wish ? t.later : t.noThanks}</button>
        </div>
      </div>
      <button ref={closeRef} type="button" className="sp-close" aria-label={t.close} onClick={dismiss}><IconClose /></button>
    </div>
  );
}
