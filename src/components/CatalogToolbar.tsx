"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABEL, SORTS } from "@/lib/fonts";
import { formatNumber } from "@/lib/format";

export default function CatalogToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
    },
    [params, pathname, router],
  );

  // Always call the latest push from the debounce timer (avoids a stale params snapshot).
  const pushRef = useRef(push);
  pushRef.current = push;

  // Re-sync the input when the URL's q changes from elsewhere (nav / back button),
  // but not while the user is mid-edit (q already differs from the URL).
  const lastQ = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastQ.current) { setQ(urlQ); lastQ.current = urlQ; }
  }, [urlQ]);

  // Debounce the search box.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => { lastQ.current = q; pushRef.current({ q: q || null }); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div aria-busy={isPending}>
      <div className="toolbar">
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Shrift qidirish…"
            aria-label="Qidiruv"
          />
        </div>
        <button
          className={`chip${cyr ? " active" : ""}`}
          aria-pressed={cyr}
          onClick={() => push({ cyr: cyr ? null : "1" })}
          aria-label="Kirill yozuvini qoʻllab-quvvatlaydigan shriftlar"
        >
          Kirill yozuvi
        </button>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }} role="status">
          {isPending ? "Yuklanmoqda…" : `${formatNumber(total)} oila`}
        </span>
        <select className="sel" value={sort} aria-label="Saralash" onChange={(e) => push({ sort: e.target.value })}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="toolbar">
        <button className={`chip${cat === "" ? " active" : ""}`} aria-pressed={cat === ""} onClick={() => push({ cat: null })}>Hammasi</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip${cat === c ? " active" : ""}`} aria-pressed={cat === c} onClick={() => push({ cat: c })}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
    </div>
  );
}
