"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type PreviewView = "grid" | "list";
type Ctx = {
  /** Custom specimen text ("" = each font shows its own default). */
  text: string;
  setText: (s: string) => void;
  size: number;
  setSize: (n: number) => void;
  view: PreviewView;
  setView: (v: PreviewView) => void;
  ready: boolean;
};

const PreviewCtx = createContext<Ctx | null>(null);
const KEY = "feekr_preview";
export const PREVIEW_MIN = 20;
export const PREVIEW_MAX = 160;
export const PREVIEW_DEFAULT = 52;
const MAX_TEXT = 140;

export function usePreview(): Ctx {
  const c = useContext(PreviewCtx);
  if (!c) throw new Error("usePreview must be used within PreviewProvider");
  return c;
}

/** Shared "type anything" state for every specimen on the site (home, catalog,
 * wishlist). Remembered per browser; storage failures are ignored. */
export default function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [text, setTextState] = useState("");
  const [size, setSizeState] = useState(PREVIEW_DEFAULT);
  const [view, setViewState] = useState<PreviewView>("grid");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof v.text === "string") setTextState(v.text.slice(0, MAX_TEXT));
      if (Number.isFinite(v.size)) setSizeState(Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, v.size)));
      if (v.view === "list" || v.view === "grid") setViewState(v.view);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({ text, size, view })); } catch { /* ignore */ }
  }, [text, size, view, ready]);

  const setText = useCallback((s: string) => setTextState(s.slice(0, MAX_TEXT)), []);
  const setSize = useCallback((n: number) => setSizeState(Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, Math.round(n)))), []);
  const setView = useCallback((v: PreviewView) => setViewState(v), []);

  const value = useMemo(() => ({ text, setText, size, setSize, view, setView, ready }), [text, setText, size, setSize, view, setView, ready]);
  return <PreviewCtx.Provider value={value}>{children}</PreviewCtx.Provider>;
}

/** Renders the shared preview text, or `fallback` until the visitor types. */
export function PreviewText({ fallback, className, style }: { fallback: string; className?: string; style?: React.CSSProperties }) {
  const { text, ready } = usePreview();
  const t = ready && text.trim() ? text : fallback;
  return <div className={className} style={style}>{t}</div>;
}
