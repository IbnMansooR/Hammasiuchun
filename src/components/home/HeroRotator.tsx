"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cssFamily } from "@/lib/fonts";

type F = { slug: string; name: string; weight: number; italic: boolean };

/** The headline's last word, re-set in a different family every few seconds.
 * The next font is loaded before the swap (no flash of fallback text); the
 * cycle pauses in background tabs and is off for reduced-motion users. */
export default function HeroRotator({ lead, word, fonts }: { lead: string; word: string; fonts: F[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    if (fonts.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;
    const tick = async () => {
      const next = (idx.current + 1) % fonts.length;
      try { await document.fonts.load(`64px "${cssFamily(fonts[next].slug)}"`, word); } catch { /* fall through */ }
      if (stop) return;
      if (document.hidden) { timer = setTimeout(tick, 2600); return; }
      setOut(true);
      timer = setTimeout(() => {
        idx.current = next;
        setI(next);
        setOut(false);
        timer = setTimeout(tick, 2600);
      }, 300);
    };
    timer = setTimeout(tick, 2600);
    return () => { stop = true; clearTimeout(timer); };
  }, [fonts, word]);

  const f = fonts[i];
  return (
    <>
      <h1 className="hero-title">
        {lead}{" "}
        <span className="rot-line">
          <span className="rot">
            <span
              className={`rot-word${out ? " out" : ""}`}
              style={f ? { fontFamily: `"${cssFamily(f.slug)}", var(--font-display)`, fontWeight: f.weight, fontStyle: f.italic ? "italic" : "normal" } : undefined}
            >
              {word}
            </span>
          </span>
          .
        </span>
      </h1>
      {f && (
        <p className="rot-cap">
          <span className="rot-dot" aria-hidden="true" />
          <span>Shrift:</span> <Link href={`/fonts/${f.slug}`}>{f.name}</Link>
        </p>
      )}
    </>
  );
}
