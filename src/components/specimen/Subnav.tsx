"use client";
import { useEffect, useRef, useState } from "react";
import { IconDownload } from "../Icons";
import { trackEvent } from "@/lib/trackClient";
import { offerSave } from "@/lib/savePrompt";

const LINKS = [
  { id: "sinash", label: "Sinash" },
  { id: "uslublar", label: "Uslublar" },
  { id: "belgilar", label: "Belgilar" },
  { id: "matn", label: "Matn" },
  { id: "haqida", label: "Haqida" },
];

/** Sticky in-page navigation with scroll-spy; once the hero's download button
 * scrolls away, the family name and a compact download button slide in. */
export default function Subnav({ name, slug, styleCount, has }: { name: string; slug: string; styleCount: number; has: string[] }) {
  const [active, setActive] = useState("sinash");
  const [stuck, setStuck] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const links = LINKS.filter((l) => has.includes(l.id));

  useEffect(() => {
    const cta = document.getElementById("hero-cta");
    if (!cta) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: "-120px 0px 0px 0px" });
    io.observe(cta);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const els = links.map((l) => document.getElementById(l.id)).filter((x): x is HTMLElement => !!x);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-130px 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [links.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`subnav${stuck ? " stuck" : ""}`} ref={ref}>
      <div className="container subnav-in">
        <span className="subnav-name" aria-hidden={!stuck}>{name}</span>
        <nav className="subnav-links" aria-label="Sahifa boʻlimlari">
          {links.map((l) => (
            <a key={l.id} href={`#${l.id}`} aria-current={active === l.id ? "true" : undefined}>{l.label}</a>
          ))}
        </nav>
        <a className="btn btn-accent btn-sm subnav-cta" href={`/api/download-family/${slug}`} onClick={() => { trackEvent("download", slug); offerSave("download", {}, 1500); }} tabIndex={stuck ? 0 : -1} aria-hidden={!stuck}>
          <IconDownload className="ico" /> <span className="t">Yuklab olish ({styleCount})</span>
        </a>
      </div>
    </div>
  );
}
