"use client";
import { useState } from "react";

/** A colour chip that copies its hex on click (or the whole CSS block, with `css`). */
export default function Swatch({ hex, label, fg, copy, big, shown }: { hex: string; label: string; fg: string; copy?: string; big?: boolean; shown?: string }) {
  const [state, setState] = useState<"idle" | "done" | "err">("idle");
  const text = copy ?? hex.toUpperCase();
  const go = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch { /* fall through to the old way */ }
    if (!ok) {
      // Older or non-secure contexts: a hidden textarea and execCommand.
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    setState(ok ? "done" : "err");
    setTimeout(() => setState("idle"), 1400);
  };
  return (
    <button type="button" onClick={go} className="kit-swatch" style={{ background: hex, color: fg, height: big ? 120 : 84 }} aria-label={`${label} ${hex.toUpperCase()}: nusxalash`}>
      <span className="kit-swatch-role">{label}</span>
      <span className="kit-swatch-hex">{state === "done" ? "Nusxalandi ✓" : state === "err" ? "Nusxalab boʻlmadi" : (shown ?? hex.toUpperCase())}</span>
    </button>
  );
}
