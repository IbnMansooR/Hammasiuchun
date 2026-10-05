"use client";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/trackClient";
import type { ActiveAd } from "@/lib/ads";

/** One labelled banner. It counts a view once, when at least half of it has been on screen for a second,
 * and a click when it is followed. The link is marked sponsored and always says "Reklama". */
export default function AdBox({ ad }: { ad: ActiveAd }) {
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let timer = 0;
    let seen = false;
    const io = new IntersectionObserver(([e]) => {
      if (seen) return;
      if (e.isIntersecting) {
        timer = window.setTimeout(() => { seen = true; io.disconnect(); trackEvent("ad_view", String(ad.id)); }, 1000);
      } else {
        window.clearTimeout(timer);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); };
  }, [ad.id]);

  return (
    <aside className="ad" ref={box} aria-label="Reklama">
      <a href={ad.href} target="_blank" rel="sponsored noopener noreferrer" onClick={() => trackEvent("ad_click", String(ad.id))}>
        <img src={ad.image} alt={ad.title} width={ad.width} height={ad.height} loading="lazy" decoding="async" />
      </a>
      <span className="ad-tag">Reklama</span>
    </aside>
  );
}
