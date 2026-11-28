"use client";
import { useState } from "react";

/** A read-only link with a copy button (report links, UTM links, ready texts). */
export default function CopyField({ value, label, multiline = false }: { value: string; label: string; multiline?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch { /* the field can still be selected by hand */ }
  };
  return (
    <span className={`adm-copy${multiline ? " multi" : ""}`}>
      {multiline
        ? <textarea readOnly value={value} aria-label={label} rows={4} onFocus={(e) => e.currentTarget.select()} />
        : <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} />}
      <button type="button" className="chip" onClick={copy}>{done ? "Nusxalandi ✓" : "Nusxalash"}</button>
    </span>
  );
}
