"use client";
import { useStore } from "./StoreProvider";
import { FREEWARE_WARNING, FREEWARE_WARNING_RU, licenseNote } from "@/lib/license";
import { useLocale, useT } from "@/i18n/client";
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
  const locale = useLocale();
  const t = useT().font;

  return (
    <div className="dl-card">
      <div className="free"><b>{t.free}</b><span>{t.zip(styleCount)}</span></div>
      <p>{t.zipText}</p>
      <a id="hero-cta" className="btn btn-accent btn-lg btn-block" href={`/api/download-family/${slug}`} onClick={() => { trackEvent("download", slug); offerSave("download", {}, 1500); }}>
        <IconDownload className="ico" /> {t.download}
      </a>
      <button type="button" className={`btn btn-block${wished ? " btn-on" : ""}`} aria-pressed={wished} onClick={() => toggleWish({ slug, name })}>
        <IconHeart className="ico" /> {wished ? t.inWish : t.addWish}
      </button>
      <div className="dl-lic">
        <strong>{t.licenseLabel}</strong> {licenseNote(licenseClass, locale) ?? licenseClass}
        {licenseClass === "Freeware" && <p role="note" className="alert alert-warn">{locale === "ru" ? FREEWARE_WARNING_RU : FREEWARE_WARNING}</p>}
      </div>
    </div>
  );
}
