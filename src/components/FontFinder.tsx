"use client";
import { useRef, useState } from "react";
import { useT } from "@/i18n/client";
import Link from "./LLink";

type Found = { slug: string; name: string; category: string; pct: number };

/** Upload a picture of text, type the text, see the closest fonts (the work is done by /api/find-font). */
export default function FontFinder() {
  const t = useT().finder;
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fonts, setFonts] = useState<Found[] | null>(null);
  const [line, setLine] = useState(false);
  const [asked, setAsked] = useState("");

  function onPick(f: File | undefined) {
    setFonts(null);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    setName(f?.name ?? "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const f = file.current?.files?.[0];
    if (!f || text.trim().length < 2) { setError(t.needBoth); return; }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", f);
      fd.append("text", text.trim());
      const r = await fetch("/api/find-font", { method: "POST", body: fd });
      const j = (await r.json().catch(() => ({}))) as { error?: string; fonts?: Found[]; mode?: string };
      if (!r.ok || !j.fonts) { setError(j.error ?? t.errorGeneric); setFonts(null); }
      else { setFonts(j.fonts); setLine(j.mode === "line"); setAsked(text.trim()); }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="finder narrow">
      <form className="finder-form" onSubmit={submit}>
        <div className="finder-drop">
          <input ref={file} id="finder-file" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} />
          <label htmlFor="finder-file" className="btn">{t.pick}</label>
          {name && <span className="finder-name">{t.picked} {name}</span>}
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="finder-preview" />
        )}
        <label className="finder-field">
          <span>{t.textLabel}</span>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={24} className="input" autoComplete="off" />
          <small>{t.textHelp}</small>
        </label>
        <button className="btn btn-accent" disabled={busy} aria-busy={busy}>{busy ? t.working : t.go}</button>
        <p className="finder-error" role="alert">{error}</p>
      </form>
      {fonts && (
        <section aria-labelledby="finder-results" className="finder-results">
          <h2 id="finder-results">{t.results}</h2>
          {line && <p className="finder-note">{t.noteLine}</p>}
          <ol>
            {fonts.map((f) => (
              <li key={f.slug}>
                <Link href={`/fonts/${f.slug}?t=${encodeURIComponent(asked)}`} className="finder-row">
                  <strong>{f.name}</strong>
                  <span className="finder-cat">{f.category}</span>
                  <span className="finder-bar" aria-hidden><i style={{ width: `${f.pct}%` }} /></span>
                  <span className="finder-pct">{f.pct}% {t.match}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
