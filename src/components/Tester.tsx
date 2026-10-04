"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { styleFamily, WEIGHT_LABEL, PANGRAM } from "@/lib/fonts";
import type { GlyphSupport } from "@/lib/glyphSupport";

type S = { style: string; subfamily: string | null; weight: number; italic: boolean };
type Align = "left" | "center" | "right";

const MAX_SIZE = 320;
const MIN_SIZE = 16;

function presets(name: string, support: GlyphSupport | null): { key: string; label: string; text: string }[] {
  const a = support?.uzLatin ? "ʻ" : "‘";
  const list = [
    { key: "name", label: "Shrift nomi", text: name },
    { key: "uz", label: "Oʻzbekcha", text: `O${a}zbekiston — g${a}oyalar, quyosh va shriftlar yurti. Shirin so${a}zlar, chiroyli harflar.` },
    { key: "uzc", label: "Ўзбекча", text: "Ўзбекистон — ғоялар, қуёш ва шрифтлар юрти. Ҳаёт гўзал!" },
    { key: "en", label: "Pangram", text: PANGRAM },
    { key: "abc", label: "ABC", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz" },
    { key: "num", label: "0–9", text: "0123456789 ?!&@%$€ (…) «—» +−×÷=" },
  ];
  return support && !support.cyrillic ? list.filter((p) => p.key !== "uzc") : list;
}

export default function Tester({
  slug, name, styles, support = null,
}: { slug: string; name: string; styles: S[]; support?: GlyphSupport | null }) {
  const hasItalic = styles.some((s) => s.italic);
  const hasUpright = styles.some((s) => !s.italic);
  const defaultWeight = useMemo(() => {
    const upright = styles.filter((s) => !s.italic);
    const base = upright.length ? upright : styles;
    return base.map((s) => s.weight).reduce((best, w) => (Math.abs(w - 400) < Math.abs(best - 400) ? w : best), 400);
  }, [styles]);

  const [italic, setItalic] = useState(false);
  const [size, setSize] = useState(140);
  const [maxSize, setMaxSize] = useState(MAX_SIZE);
  const [text, setText] = useState(name);
  const [weight, setWeight] = useState<number>(defaultWeight);
  const [align, setAlign] = useState<Align>("left");
  const [dark, setDark] = useState(false);
  const [color, setColor] = useState("#0b0b0c");
  const boxRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const userSized = useRef(false);

  // The slider's range follows the available width, so the number it shows is
  // always the size actually rendered (no hidden 13vw cap).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const m = Math.max(48, Math.min(MAX_SIZE, Math.round(el.clientWidth / 2.2)));
      setMaxSize(m);
      setSize((s) => (userSized.current ? Math.min(s, m) : Math.min(140, m)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Grow the textarea with its content instead of scrolling inside a fixed box.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, size, weight, italic, align]);

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

  const cut =
    weightCuts.find((s) => s.weight === weight) ??
    weightCuts.reduce((best, s) => (Math.abs(s.weight - weight) < Math.abs(best.weight - weight) ? s : best), weightCuts[0]);

  if (!styles.length || !cut) return null;

  const weightName = (s: S) => (s.subfamily || "").replace(/\s*Italic$/i, "").trim() || WEIGHT_LABEL[s.weight] || String(s.weight);
  const presetList = presets(name, support);

  function reset() {
    userSized.current = false;
    setText(name);
    setSize(Math.min(140, maxSize));
    setWeight(defaultWeight);
    setItalic(false);
    setAlign("left");
    setDark(false);
    setColor("#0b0b0c");
  }

  const fg = dark ? (color === "#0b0b0c" ? "#ffffff" : color) : color;

  return (
    <div className="tester" ref={boxRef}>
      <div className="tester-bar">
        <div className="tester-weights" role="group" aria-label="Qalinlik">
          {weightCuts.map((s) => (
            <button
              key={s.weight}
              type="button"
              className={`chip${s.weight === cut.weight ? " active" : ""}`}
              aria-pressed={s.weight === cut.weight}
              onClick={() => setWeight(s.weight)}
            >
              {weightName(s)}
            </button>
          ))}
        </div>

        {hasItalic && hasUpright && (
          <button type="button" className={`chip${italic ? " active" : ""}`} aria-pressed={italic} onClick={() => setItalic((v) => !v)}>
            Kursiv
          </button>
        )}

        <label className="tester-ctl">
          <span>Hajm</span>
          <input
            type="range" min={MIN_SIZE} max={maxSize} step={1}
            value={size}
            aria-valuetext={`${size} piksel`}
            onChange={(e) => { userSized.current = true; setSize(Number(e.target.value)); }}
          />
          <b>{size}px</b>
        </label>
      </div>

      <div className="tester-tools">
        <label className="tester-preset">
          <span className="sr-only">Namuna matni</span>
          <select
            className="sel"
            aria-label="Namuna matni"
            value={presetList.find((p) => p.text === text)?.key ?? ""}
            onChange={(e) => { const p = presetList.find((x) => x.key === e.target.value); if (p) setText(p.text); }}
          >
            <option value="" disabled>Namuna…</option>
            {presetList.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>

        <div className="tester-align" role="group" aria-label="Tekislash">
          {(["left", "center", "right"] as Align[]).map((a) => (
            <button key={a} type="button" className={`chip${align === a ? " active" : ""}`} aria-pressed={align === a} onClick={() => setAlign(a)}
              aria-label={a === "left" ? "Chapga" : a === "center" ? "Markazga" : "Oʻngga"}>
              <AlignIcon align={a} />
            </button>
          ))}
        </div>

        <label className="tester-color">
          <span>Rang</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Matn rangi" />
        </label>

        <button type="button" className={`chip${dark ? " active" : ""}`} aria-pressed={dark} onClick={() => setDark((v) => !v)}>
          Qora fon
        </button>

        <button type="button" className="chip" onClick={reset}>Tiklash</button>
      </div>

      <textarea
        ref={areaRef}
        className="tester-input"
        aria-label="Namuna matni — oʻzingiz yozing"
        value={text}
        rows={1}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        style={{
          fontFamily: `"${styleFamily(slug, cut.style)}", var(--font)`,
          fontWeight: cut.weight,
          fontStyle: cut.italic ? "italic" : "normal",
          fontSize: `${size}px`,
          textAlign: align,
          color: fg,
          background: dark ? "#0b0b0c" : "transparent",
        }}
      />
    </div>
  );
}

// Classic "text align" glyph: four lines, the short ones pushed to the chosen side.
function AlignIcon({ align }: { align: Align }) {
  const x = (w: number) => (align === "left" ? 2 : align === "center" ? (16 - w) / 2 : 14 - w);
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      {[12, 8, 12, 8].map((w, i) => <rect key={i} x={x(w)} y={2 + i * 3.5} width={w} height="1.8" rx="0.9" />)}
    </svg>
  );
}
