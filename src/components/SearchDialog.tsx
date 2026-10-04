"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABEL } from "@/lib/fonts";
import { cardsFaceCSS, cardFontStyle, type CardFont } from "@/lib/cards";
import { IconArrow, IconSearch } from "./Icons";

/** ⌘K / "/" quick search. A native <dialog> gives focus trapping, Esc and an
 * inert page for free; results follow the ARIA combobox pattern. */
export default function SearchDialog({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CardFont[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onOpen(); }
      else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); onOpen(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); requestAnimationFrame(() => inputRef.current?.select()); }
    if (!open && d.open) d.close();
  }, [open]);

  // Debounced fetch; stale responses are aborted.
  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        const data = (await r.json()) as { items: CardFont[] };
        setItems(data.items ?? []);
        setActive(0);
      } catch { /* aborted / offline */ }
      finally { if (!ctl.signal.aborted) setLoading(false); }
    }, q ? 140 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q, open]);

  const go = useCallback((href: string) => { onClose(); router.push(href); }, [onClose, router]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) go(`/fonts/${it.slug}`);
      else if (q.trim()) go(`/fonts?q=${encodeURIComponent(q.trim())}`);
    }
  }

  useEffect(() => {
    document.getElementById(`sr-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const catalogHref = q.trim() ? `/fonts?q=${encodeURIComponent(q.trim())}` : "/fonts";

  return (
    <dialog
      ref={ref}
      className="sdlg"
      aria-label="Shrift qidirish"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("sdlg-wrap")) onClose(); }}
    >
      {open && <style dangerouslySetInnerHTML={{ __html: cardsFaceCSS(items) }} />}
      <div className="sdlg-wrap">
        <div className="sdlg-panel">
          <div className="sdlg-input">
            <IconSearch />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls="sdlg-list"
              aria-activedescendant={items[active] ? `sr-${active}` : undefined}
              aria-autocomplete="list"
              placeholder="Shrift nomini yozing…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="kbd">esc</kbd>
          </div>
          {items.length > 0 ? (
            <ul className="sdlg-list" id="sdlg-list" role="listbox" aria-label={q ? "Natijalar" : "Ommabop shriftlar"}>
              {items.map((it, i) => (
                <li
                  key={it.slug}
                  id={`sr-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className="sdlg-item"
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(`/fonts/${it.slug}`)}
                >
                  <span className="sdlg-aa" style={cardFontStyle(it)} aria-hidden="true">Aa</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="sdlg-name" style={{ display: "block" }}>{it.name}</span>
                    <span className="sdlg-meta">{CATEGORY_LABEL[it.category] ?? it.category} · {it.styleCount} uslub</span>
                  </span>
                  <span className="sdlg-go" aria-hidden="true">{i === active ? "↵" : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="sdlg-empty" role="status">{loading ? "Qidirilmoqda…" : q ? `“${q}” boʻyicha shrift topilmadi.` : "Yuklanmoqda…"}</div>
          )}
          <div className="sdlg-foot">
            <div className="keys">
              <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> tanlash</span>
              <span><kbd className="kbd">↵</kbd> ochish</span>
            </div>
            <a href={catalogHref} onClick={(e) => { e.preventDefault(); go(catalogHref); }} className="arrow-link" style={{ fontSize: 13 }}>
              Katalogda koʻrish <IconArrow style={{ width: 14, height: 14 }} />
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
