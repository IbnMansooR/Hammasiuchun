import Link from "./LLink";
import LangSwitch from "./LangSwitch";
import { getT } from "@/i18n/server";
import { getSiteSettings } from "@/lib/settings";
import { getPublicCounts } from "@/lib/stats";
import { formatNumber } from "@/lib/format";
import { Logo, Wordmark } from "./Logo";
import { IconArrow } from "./Icons";

export default async function Footer() {
  const [{ socials }, { families }, d] = await Promise.all([getSiteSettings(), getPublicCounts(), getT()]);
  const t = d.footer;
  const visible = socials.filter((s) => s.enabled && s.url);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cta">
          <h2>{t.ctaA}<em>{t.ctaFree}</em>.</h2>
          <Link href="/fonts" className="btn btn-light btn-lg">{t.openCatalog} <IconArrow className="ico" /></Link>
        </div>
        <div className="footer-grid">
          <div>
            <Link href="/" className="footer-mark" aria-label={d.header.home} style={{ display: "inline-block" }}><Logo /></Link>
            <p className="footer-about">
              {t.about}
              {families > 0 ? t.families(formatNumber(families)) : ""}
            </p>
          </div>
          <div className="col">
            <h3>{t.fonts}</h3>
            <Link href="/fonts">{t.allFonts}</Link>
            <Link href="/fonts?cat=Sans">Sans-serif</Link>
            <Link href="/fonts?cat=Serif">Serif</Link>
            <Link href="/fonts?cat=Display">Display</Link>
            <Link href="/fonts?cyr=1">{t.cyrillic}</Link>
            <Link href="/pairs">{t.pairs}</Link>
          </div>
          <div className="col">
            <h3>Feekr</h3>
            <Link href="/about">{t.about2}</Link>
            <Link href="/blog">{t.blog}</Link>
            <Link href="/license">{t.license}</Link>
            <Link href="/support">{t.support}</Link>
            <Link href="/maxfiylik">{t.privacy}</Link>
            <Link href="/reklama">{t.ads}</Link>
            <LangSwitch variant="long" />
          </div>
          {visible.length > 0 && (
            <div className="col">
              <h3>{t.social}</h3>
              {visible.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a>
              ))}
            </div>
          )}
        </div>
        <div className="footer-word" aria-hidden="true"><Wordmark /></div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Feekr · {t.city}</span>
          <span>{t.eachLicence} · <Link href="/license">{t.terms}</Link></span>
        </div>
      </div>
    </footer>
  );
}
