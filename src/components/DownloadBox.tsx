"use client";
import { useStore } from "./StoreProvider";
import { FREEWARE_WARNING, LICENSE_NOTE } from "@/lib/license";
import { IconDownload, IconHeart } from "./Icons";
import { trackEvent } from "@/lib/trackClient";
import { offerSave } from "@/lib/savePrompt";

export default function DownloadBox({
  slug, name, styleCount, licenseClass,
}: {
  slug: string; name: string; styleCount: number; licenseClass: string;
}) {
  const { toggleWish, inWish, ready } = useStore();
  const wished = ready && inWish(slug);

  return (
    <div className="dl-card">
      <div className="free"><b>Bepul</b><span>{styleCount} uslub · ZIP</span></div>
      <p>Toʻliq oila bitta faylda: barcha uslublar va litsenziya matni.</p>
      <a id="hero-cta" className="btn btn-accent btn-lg btn-block" href={`/api/download-family/${slug}`} onClick={() => { trackEvent("download", slug); offerSave("download", {}, 1500); }}>
        <IconDownload className="ico" /> Yuklab olish
      </a>
      <button type="button" className={`btn btn-block${wished ? " btn-on" : ""}`} aria-pressed={wished} onClick={() => toggleWish({ slug, name })}>
        <IconHeart className="ico" /> {wished ? "Sevimlilarda" : "Sevimlilarga qoʻshish"}
      </button>
      <div className="dl-lic">
        <strong>Litsenziya:</strong> {LICENSE_NOTE[licenseClass] ?? licenseClass}
        {licenseClass === "Freeware" && <p role="note" className="alert alert-warn">{FREEWARE_WARNING}</p>}
      </div>
    </div>
  );
}
