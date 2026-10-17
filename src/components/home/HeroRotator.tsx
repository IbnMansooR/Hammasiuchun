"use client";
import Link from "../LLink";
import { useT } from "@/i18n/client";
import { useEffect, useRef, useState } from "react";
import { cssFamily, webfontUrl } from "@/lib/fonts";

type F = { slug: string; name: string; style: string; weight: number; italic: boolean };

/** Fonts are declared only when their turn comes (the page declares the first one). */
async function loadFont(f: F, text: string): Promise<boolean> {
  const family = cssFamily(f.slug);
  const style = f.italic ? "italic" : "normal";
  if (![...document.fonts].some((x) => x.family.replace(/"/g, "") === family)) {
    const face = new FontFace(family, `url("${webfontUrl(f.slug, f.style)}") format("woff2")`, { weight: String(f.weight), style, display: "swap" });
    document.fonts.add(face);
  }
  const loaded = await document.fonts.load(`${style} ${f.weight} 64px "${family}"`, text);
  return loaded.length > 0;
}

/** The headline's last word, re-set in a different family every few seconds.
 * The next font is loaded before the swap (no flash of fallback text); the
 * cycle pauses in background tabs and is off for reduced-motion users. */
export default function HeroRotator({ lead, word, fonts }: { lead: string; word: string; fonts: F[] }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  const idx = useRef(0);
  const fontLabel = useT().card.fontLabel;

  useEffect(() => {
    if (fonts.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;
    const tick = async () => {
      let next = (idx.current + 1) % fonts.length;
      // A font that fails to load is skipped (up to a few tries), never shown half-drawn.
      for (let tries = 0; tries < 4; tries++) {
        const ok = await loadFont(fonts[next], word).catch(() => false);
        if (ok || stop) break;
        next = (next + 1) % fonts.length;
      }
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
          <span>{fontLabel}</span> <Link href={`/fonts/${f.slug}`}>{f.name}</Link>
        </p>
      )}
    </>
  );
}
