"use client";
import { useState } from "react";

/** A colour chip that copies its hex on click (or the whole CSS block, with `css`). */
export default function Swatch({ hex, label, fg, copy, big, shown }: { hex: string; label: string; fg: string; copy?: string; big?: boolean; shown?: string }) {
  const [done, setDone] = useState(false);
  const text = copy ?? hex.toUpperCase();
  const go = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1100); } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={go} className="kit-swatch" style={{ background: hex, color: fg, height: big ? 120 : 84 }} aria-label={`${label} ${hex.toUpperCase()}: nusxalash`}>
      <span className="kit-swatch-role">{label}</span>
      <span className="kit-swatch-hex">{done ? "Nusxalandi ✓" : (shown ?? hex.toUpperCase())}</span>
    </button>
  );
}
