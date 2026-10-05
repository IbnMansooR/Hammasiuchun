"use client";
import { useState } from "react";
import type { GlyphGroup } from "@/lib/glyphSupport";
import { IconCopy } from "../Icons";

const hex = (ch: string) => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");

/** Character set grid with a large inspector for the selected glyph. */
export default function GlyphMap({ groups, fontFamily, weight, italic, total }: {
  groups: GlyphGroup[]; fontFamily: string; weight: number; italic: boolean; total: number;
}) {
  const all = groups.flatMap((g) => g.chars);
  const [sel, setSel] = useState(all.includes("g") ? "g" : all[0] ?? "A");
  const [copied, setCopied] = useState(false);
  const [more, setMore] = useState(false);
  const MAIN = ["latin", "uz", "cyr", "num"];
  const main = groups.filter((g) => MAIN.includes(g.key));
  const extra = groups.filter((g) => !MAIN.includes(g.key));
  const shownGroups = more || !main.length ? groups : main;
  const extraN = extra.reduce((n, g) => n + g.chars.length, 0);
  const font = { fontFamily, fontWeight: weight, fontStyle: italic ? "italic" : "normal" } as const;

  async function copy() {
    try { await navigator.clipboard.writeText(sel); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* blocked */ }
  }

  return (
    <div className="glyphs">
      <div className="glyph-insp">
        <div className="glyph-big" style={font} aria-live="polite" aria-label={`Tanlangan belgi: ${sel} (${hex(sel)})`}>{sel}</div>
        <div className="glyph-meta">
          <span><b>{hex(sel)}</b> · {total} belgidan</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
            <IconCopy className="ico" /> {copied ? "Nusxalandi" : "Nusxa olish"}
          </button>
        </div>
      </div>
      <div>
        {shownGroups.map((g) => (
          <div className="glyph-group" key={g.key}>
            <h3>{g.label} <span className="num">· {g.chars.length}</span></h3>
            <div className="glyph-cells" role="group" aria-label={g.label}>
              {g.chars.map((ch) => (
                <button type="button" key={ch} style={font} aria-pressed={sel === ch} onClick={() => setSel(ch)} onMouseEnter={() => setSel(ch)} aria-label={`${ch} ${hex(ch)}`}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ))}
        {extraN > 0 && main.length > 0 && (
          <button type="button" className="btn btn-sm glyph-more" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            {more ? "Kamroq koʻrsatish" : `Yana ${extraN} ta belgi — qoʻshimcha harflar va simvollar`}
          </button>
        )}
      </div>
    </div>
  );
}
