"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition } from "react";
import { CATEGORIES, categoryLabel } from "@/lib/fonts";
import { useLocale, useT } from "@/i18n/client";
import { stripLocale, withLocale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";
import { usePreview, PREVIEW_MIN, PREVIEW_MAX } from "./PreviewProvider";
import { IconClose, IconGrid, IconList, IconSearch } from "./Icons";

// Lets the results grid dim while a filter navigation is in flight.
const PendingCtx = createContext(false);

/** Sticky catalog controls: specimen text + size + view (client-side, instant)
 * and the URL-driven filters (search, category, Cyrillic, sort). */
export function CatalogShell({ total, children }: { total: number; children: React.ReactNode }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT().catalog;
  const pathname = withLocale(locale, stripLocale(usePathname() ?? "/fonts").path);
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { text, setText, size, setSize, view, setView } = usePreview();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  const cat = params.get("cat") ?? "";
  const sort = params.get("sort") ?? "popular";
  const cyr = params.get("cyr") === "1";

  // useSearchParams() only changes once a navigation commits (1–3 s on a slow
  // server). Build every push on the last URL we *asked* for, and take q from
  // the live input, so a chip clicked mid-navigation can't resurrect old state.
  const pendingQs = useRef<string | null>(null);
  const qLive = useRef(q);
  qLive.current = q;
  useEffect(() => { if (!isPending) pendingQs.current = null; }, [isPending]);

  const push = useCallback(
    (next: Record<string, string | null>) => {
      const p = new URLSearchParams(pendingQs.current ?? params.toString());
      if (!("q" in next)) {
        if (qLive.current) p.set("q", qLive.current);
        else p.delete("q");
      }
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      p.delete("page");
      p.delete("filter"); // legacy "Bepul" filter — every font is free now
      const qs = p.toString();
      pendingQs.current = qs;
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const pushRef = useRef(push);
  pushRef.current = push;

  // Re-sync the input when the URL's q changes from elsewhere (nav / back button),
  // but not while the user is mid-edit (q already differs from the URL).
  const lastQ = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastQ.current) { setQ(urlQ); lastQ.current = urlQ; }
  }, [urlQ]);

  // Debounce the name search.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => { lastQ.current = q; pushRef.current({ q: q || null }); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = ((size - PREVIEW_MIN) / (PREVIEW_MAX - PREVIEW_MIN)) * 100;

  return (
    <PendingCtx.Provider value={isPending}>
      <div className="ctrl">
        <div className="container">
          <div className="ctrl-row">
            <label className="ctrl-preview">
              <span className="aa" aria-hidden="true">Aa</span>
              <span className="sr-only">{t.sampleLabel}</span>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.samplePlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
              {text && (
                <button type="button" className="clear" onClick={() => setText("")} aria-label={t.clearText}>
                  <IconClose style={{ width: 16, height: 16 }} />
                </button>
              )}
            </label>
            <label className="ctl ctrl-size">
              <span>{t.size}</span>
              <input
                className="range"
                type="range"
                min={PREVIEW_MIN}
                max={PREVIEW_MAX}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                style={{ "--p": `${pct}%` } as React.CSSProperties}
                aria-valuetext={t.px(size)}
              />
              <output>{size}px</output>
            </label>
            <div className="seg" role="group" aria-label={t.view}>
              <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} aria-label={t.grid} title={t.grid}><IconGrid /></button>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} aria-label={t.list} title={t.list}><IconList /></button>
            </div>
          </div>
          <div className="ctrl-filters">
            <label className="search">
              <IconSearch />
              <span className="sr-only">{t.searchLabel}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} />
            </label>
            <span className="vr" aria-hidden="true" />
            <div className="chips" role="group" aria-label={t.category}>
              <button type="button" className="chip" aria-pressed={cat === ""} onClick={() => push({ cat: null })}>{t.all}</button>
              {CATEGORIES.map((c) => (
                <button type="button" key={c} className="chip" aria-pressed={cat === c} onClick={() => push({ cat: cat === c ? null : c })}>
                  {categoryLabel(c, locale)}
                </button>
              ))}
              <button type="button" className="chip" aria-pressed={cyr} onClick={() => push({ cyr: cyr ? null : "1" })} title={t.cyrHint}>
                {t.cyr}
              </button>
            </div>
            <span className="ctrl-count" role="status">{isPending ? t.loading : t.families(formatNumber(total))}</span>
            <select className="sel" value={sort} aria-label={t.sortLabel} onChange={(e) => push({ sort: e.target.value })}>
              {Object.entries(t.sorts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
      {children}
    </PendingCtx.Provider>
  );
}

/** The card grid: view mode and specimen size come from the shared preview state. */
export function CatalogGrid({ children }: { children: React.ReactNode }) {
  const { size, view, ready } = usePreview();
  const pending = useContext(PendingCtx);
  return (
    <div
      className={`fgrid${ready && view === "list" ? " is-list" : ""}`}
      style={ready ? ({ "--ps": `${size}px` } as React.CSSProperties) : undefined}
      aria-busy={pending}
    >
      {children}
    </div>
  );
}
