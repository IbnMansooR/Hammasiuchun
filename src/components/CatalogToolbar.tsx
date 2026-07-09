"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { CATEGORIES, CATEGORY_LABEL, SORTS } from "@/lib/fonts";
import { formatNumber } from "@/lib/format";

export default function CatalogToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  const cat = params.get("cat") ?? "";
  const sort = params.get("sort") ?? "popular";
  const free = params.get("filter") === "free";
  const cyr = params.get("cyr") === "1";

  const push = useCallback(
    (next: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    },
    [params, pathname, router],
  );

  // Always call the latest push from the debounce timer (avoids a stale params snapshot).
  const pushRef = useRef(push);
  pushRef.current = push;

  // Re-sync the input when the URL's q changes from elsewhere (nav / back button),
  // but not while the user is mid-edit (q already differs from the URL).
  const lastPushed = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastPushed.current) { setQ(urlQ); lastPushed.current = urlQ; }
  }, [urlQ]);

  // Debounce the search box.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => { lastPushed.current = q; pushRef.current({ q: q || null }); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="toolbar">
        <div className="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Shrift qidirish…"
            aria-label="Qidiruv"
          />
        </div>
        <button
          className={`chip${free ? " active" : ""}`}
          onClick={() => push({ filter: free ? null : "free" })}
        >
          Bepul
        </button>
        <button
          className={`chip${cyr ? " active" : ""}`}
          onClick={() => push({ cyr: cyr ? null : "1" })}
          aria-label="Kirill yozuvini qoʻllab-quvvatlaydigan shriftlar"
        >
          Kirill yozuvi
        </button>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>{formatNumber(total)} oila</span>
        <select className="sel" value={sort} aria-label="Saralash" onChange={(e) => push({ sort: e.target.value })}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="toolbar">
        <button className={`chip${cat === "" ? " active" : ""}`} onClick={() => push({ cat: null })}>Hammasi</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip${cat === c ? " active" : ""}`} onClick={() => push({ cat: c })}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
    </div>
  );
}
