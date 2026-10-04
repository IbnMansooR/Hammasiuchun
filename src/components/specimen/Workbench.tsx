"use client";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { styleFamily, WEIGHT_LABEL, PANGRAM } from "@/lib/fonts";
import type { GlyphSupport } from "@/lib/glyphSupport";
import { IconReset } from "../Icons";

export type Cut = { style: string; subfamily: string | null; weight: number; italic: boolean };
type Align = "left" | "center" | "right";

type Ctx = {
  text: string; setText: (s: string) => void;
  weight: number; setWeight: (w: number) => void;
  italic: boolean; setItalic: (v: boolean) => void;
};
const WorkbenchCtx = createContext<Ctx | null>(null);
const useWorkbench = () => {
  const c = useContext(WorkbenchCtx);
  if (!c) throw new Error("Workbench context missing");
  return c;
};

const MIN_SIZE = 16;
const MAX_SIZE = 320;

function defaultWeightOf(cuts: Cut[]): number {
  const upright = cuts.filter((s) => !s.italic);
  const base = upright.length ? upright : cuts;
  return base.map((s) => s.weight).reduce((best, w) => (Math.abs(w - 400) < Math.abs(best - 400) ? w : best), base[0]?.weight ?? 400);
}

/** Shared state for the tester and the styles list on a font page. */
export function WorkbenchProvider({ cuts, name, children }: { cuts: Cut[]; name: string; children: React.ReactNode }) {
  const [text, setText] = useState(name);
  const [weight, setWeight] = useState(() => defaultWeightOf(cuts));
  const [italic, setItalic] = useState(() => !cuts.some((c) => !c.italic));
  const value = useMemo(() => ({ text, setText, weight, setWeight, italic, setItalic }), [text, weight, italic]);
  return <WorkbenchCtx.Provider value={value}>{children}</WorkbenchCtx.Provider>;
}

function presets(name: string, support: GlyphSupport | null) {
  const a = support?.uzLatin ? "ʻ" : "‘";
  const list = [
    { key: "name", label: "Shrift nomi", text: name },
    { key: "uz", label: "Oʻzbekcha", text: `O${a}zbekiston — g${a}oyalar, quyosh va shriftlar yurti` },
    { key: "uzc", label: "Ўзбекча", text: "Ўзбекистон — ғоялар, қуёш ва шрифтлар юрти" },
    { key: "en", label: "Pangram", text: PANGRAM },
    { key: "abc", label: "Alifbo", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz" },
    { key: "num", label: "Raqamlar", text: "0123456789 ?!&@%$€ (…) «—» +−×÷=" },
    { key: "para", label: "Abzas", text: `Yaxshi shrift o${a}zini ko${a}rsatmaydi — u matnni o${a}qishni yengillashtiradi. Harflar orasidagi masofa, so${a}zlar ritmi va satrlar oralig${a}i birgalikda sahifaga ovoz beradi.` },
  ];
  return support && !support.cyrillic ? list.filter((p) => p.key !== "uzc") : list;
}

const cutName = (s: Cut) => (s.subfamily || "").replace(/\s*Italic$/i, "").trim() || WEIGHT_LABEL[s.weight] || String(s.weight);

export function Tester({ slug, name, cuts, support = null }: { slug: string; name: string; cuts: Cut[]; support?: GlyphSupport | null }) {
  const { text, setText, weight, setWeight, italic, setItalic } = useWorkbench();
  const hasItalic = cuts.some((s) => s.italic);
  const hasUpright = cuts.some((s) => !s.italic);
  const [size, setSize] = useState(120);
  const [maxSize, setMaxSize] = useState(MAX_SIZE);
  const [align, setAlign] = useState<Align>("left");
  const [dark, setDark] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const userSized = useRef(false);

  // The slider's range follows the available width, so the number it shows is
  // always the size actually rendered.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const m = Math.max(48, Math.min(MAX_SIZE, Math.round(el.clientWidth / 2.4)));
      setMaxSize(m);
      setSize((s) => (userSized.current ? Math.min(s, m) : Math.min(120, m)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const eff = italic && hasItalic ? true : hasUpright ? false : true;
  const pool = useMemo(() => {
    const p = cuts.filter((s) => s.italic === eff);
    return p.length ? p : cuts;
  }, [cuts, eff]);
  const weightCuts = useMemo(() => {
    const byWeight = new Map<number, Cut>();
    for (const s of pool) if (!byWeight.has(s.weight)) byWeight.set(s.weight, s);
    return [...byWeight.values()].sort((a, b) => a.weight - b.weight);
  }, [pool]);
  const cut = weightCuts.find((s) => s.weight === weight)
    ?? weightCuts.reduce((best, s) => (Math.abs(s.weight - weight) < Math.abs(best.weight - weight) ? s : best), weightCuts[0]);

  // Grow the textarea with its content instead of scrolling inside a fixed box.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text, size, cut, align]);

  if (!cuts.length || !cut) return null;
  const list = presets(name, support);
  const pct = ((size - MIN_SIZE) / (maxSize - MIN_SIZE)) * 100;

  function reset() {
    userSized.current = false;
    setText(name);
    setSize(Math.min(120, maxSize));
    setWeight(defaultWeightOf(cuts));
    setItalic(!hasUpright);
    setAlign("left");
    setDark(false);
  }

  return (
    <div className={`tester${dark ? " is-dark" : ""}`} ref={boxRef}>
      <div className="tester-bar">
        {weightCuts.length > 1 && (
          <select className="sel" value={cut.weight} onChange={(e) => setWeight(Number(e.target.value))} aria-label="Qalinlik">
            {weightCuts.map((s) => <option key={s.weight} value={s.weight}>{cutName(s)} · {s.weight}</option>)}
          </select>
        )}
        {hasItalic && hasUpright && (
          <button type="button" className="chip" aria-pressed={italic} onClick={() => setItalic(!italic)}>Kursiv</button>
        )}
        <span className="grow" />
        <label className="ctl">
          <span>Hajm</span>
          <input
            className="range" type="range" min={MIN_SIZE} max={maxSize} step={1} value={size}
            style={{ "--p": `${pct}%` } as React.CSSProperties}
            aria-valuetext={`${size} piksel`}
            onChange={(e) => { userSized.current = true; setSize(Number(e.target.value)); }}
          />
          <output>{size}px</output>
        </label>
        <div className="seg tester-align" role="group" aria-label="Tekislash">
          {(["left", "center", "right"] as Align[]).map((a) => (
            <button key={a} type="button" aria-pressed={align === a} onClick={() => setAlign(a)}
              aria-label={a === "left" ? "Chapga" : a === "center" ? "Markazga" : "Oʻngga"}>
              <AlignIcon align={a} />
            </button>
          ))}
        </div>
        <button type="button" className="chip" aria-pressed={dark} onClick={() => setDark((v) => !v)}><span className="inv-light">Qora fon</span><span className="inv-dark">Oq fon</span></button>
        <button type="button" className="icon-btn" onClick={reset} aria-label="Tiklash" title="Tiklash"><IconReset /></button>
      </div>
      <div className="tester-presets" role="group" aria-label="Tayyor matnlar">
        {list.map((p) => (
          <button key={p.key} type="button" className="chip" aria-pressed={text === p.text} onClick={() => setText(p.text)}>{p.label}</button>
        ))}
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
          lineHeight: size > 80 ? 1.08 : 1.25,
        }}
      />
    </div>
  );
}

/** Every cut, set in the tester's text; clicking one loads it into the tester. */
export function StyleRows({ slug, cuts, fallback }: { slug: string; cuts: Cut[]; fallback: string }) {
  const { text, setWeight, setItalic } = useWorkbench();
  const line = (text.split("\n")[0] || "").trim() || fallback;
  return (
    <div className="styles">
      {cuts.map((s) => (
        <button
          type="button"
          key={s.style}
          className="style-row"
          style={{ width: "100%", textAlign: "left" }}
          onClick={() => {
            setWeight(s.weight);
            setItalic(s.italic);
            document.getElementById("sinash")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          <span className="txt" style={{ fontFamily: `"${styleFamily(slug, s.style)}", var(--font)`, fontWeight: s.weight, fontStyle: s.italic ? "italic" : "normal" }}>
            {line}
          </span>
          <span className="lbl"><b>{s.subfamily || s.style}</b> {s.weight}</span>
          <span className="sr-only"> — sinash maydonida ochish</span>
        </button>
      ))}
    </div>
  );
}

// Classic "text align" glyph: four lines, the short ones pushed to the chosen side.
function AlignIcon({ align }: { align: Align }) {
  const x = (w: number) => (align === "left" ? 2 : align === "center" ? (16 - w) / 2 : 14 - w);
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      {[12, 8, 12, 8].map((w, i) => <rect key={i} x={x(w)} y={2 + i * 3.5} width={w} height="1.6" rx="0.8" />)}
    </svg>
  );
}
