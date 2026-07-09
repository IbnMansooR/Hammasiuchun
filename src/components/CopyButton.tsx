"use client";
import { useEffect, useRef, useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "done" | "err">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flash = (s: "done" | "err") => {
    setState(s);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1200);
  };

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure (http) contexts where the Clipboard API is absent.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy failed");
      }
      flash("done");
    } catch {
      flash("err");
    }
  };

  return (
    <button className="chip" style={{ fontSize: 11, padding: "3px 8px" }} onClick={copy}>
      {state === "done" ? "✓ Nusxalandi" : state === "err" ? "✕ Xatolik" : "URL"}
    </button>
  );
}
