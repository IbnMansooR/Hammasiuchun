"use client";
import { useMemo, useState } from "react";
import { styleFamily, WEIGHT_LABEL } from "@/lib/fonts";

type S = { style: string; subfamily: string | null; weight: number; italic: boolean };

export default function Tester({ slug, name, styles }: { slug: string; name: string; styles: S[] }) {
  const hasItalic = styles.some((s) => s.italic);
  const hasUpright = styles.some((s) => !s.italic);
  const [italic, setItalic] = useState(false);
  const [size, setSize] = useState(140);
  const [text, setText] = useState(name);

  const eff = italic && hasItalic ? true : hasUpright ? false : true;
  const pool = useMemo(() => {
    const p = styles.filter((s) => s.italic === eff);
    return p.length ? p : styles;
  }, [styles, eff]);

  // One button per distinct weight in the current pool, ascending.
  const weightCuts = useMemo(() => {
    const byWeight = new Map<number, S>();
    for (const s of pool) if (!byWeight.has(s.weight)) byWeight.set(s.weight, s);
    return [...byWeight.values()].sort((a, b) => a.weight - b.weight);
  }, [pool]);

  const [weight, setWeight] = useState<number>(() => {
    const upright = styles.filter((s) => !s.italic);
    const base = upright.length ? upright : styles;
    return base.map((s) => s.weight).reduce((best, w) => (Math.abs(w - 400) < Math.abs(best - 400) ? w : best), 400);
  });

  const cut =
    weightCuts.find((s) => s.weight === weight) ??
    weightCuts.reduce((best, s) => (Math.abs(s.weight - weight) < Math.abs(best.weight - weight) ? s : best), weightCuts[0]);

  if (!styles.length || !cut) return null;

  const weightName = (s: S) => (s.subfamily || "").replace(/\s*Italic$/i, "").trim() || WEIGHT_LABEL[s.weight] || String(s.weight);

  return (
    <div className="tester">
      <div className="tester-bar">
        <div className="tester-weights">
          {weightCuts.map((s) => (
            <button
              key={s.weight}
              type="button"
              className={`chip${s.weight === cut.weight ? " active" : ""}`}
              onClick={() => setWeight(s.weight)}
            >
              {weightName(s)}
            </button>
          ))}
        </div>

        {hasItalic && hasUpright && (
          <button
            type="button"
            className={`chip${italic ? " active" : ""}`}
            aria-pressed={italic}
            onClick={() => setItalic((v) => !v)}
          >
            Kursiv
          </button>
        )}

        <label className="tester-ctl">
          <span>Hajm</span>
          <input
            type="range" min={16} max={320} step={1}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <b>{size}px</b>
        </label>
      </div>

      <textarea
        className="tester-input"
        aria-label="Namuna matni"
        value={text}
        rows={1}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        style={{
          fontFamily: `"${styleFamily(slug, cut.style)}", var(--font)`,
          fontWeight: cut.weight,
          fontStyle: cut.italic ? "italic" : "normal",
          fontSize: `min(${size}px, 13vw)`,
        }}
      />
    </div>
  );
}
