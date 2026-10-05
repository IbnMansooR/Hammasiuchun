import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { getPublicCounts } from "@/lib/stats";
import { formatNumber } from "@/lib/format";
import { Logo, Wordmark } from "./Logo";
import { IconArrow } from "./Icons";

export default async function Footer() {
  const [{ socials }, { families }] = await Promise.all([getSiteSettings(), getPublicCounts()]);
  const visible = socials.filter((s) => s.enabled && s.url);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cta">
          <h2>Har bir shrift — <em>bepul</em>.</h2>
          <Link href="/fonts" className="btn btn-light btn-lg">Katalogni ochish <IconArrow className="ico" /></Link>
        </div>
        <div className="footer-grid">
          <div>
            <Link href="/" className="footer-mark" aria-label="Feekr — bosh sahifa" style={{ display: "inline-block" }}><Logo /></Link>
            <p className="footer-about">
              Oʻzbek lotin va kirill yozuvi uchun shriftlar kutubxonasi.
              {families > 0 ? ` ${formatNumber(families)} ta oila, hammasi bepul.` : ""}
            </p>
          </div>
          <div className="col">
            <h3>Shriftlar</h3>
            <Link href="/fonts">Barcha shriftlar</Link>
            <Link href="/fonts?cat=Sans">Sans-serif</Link>
            <Link href="/fonts?cat=Serif">Serif</Link>
            <Link href="/fonts?cat=Display">Display</Link>
            <Link href="/fonts?cyr=1">Kirill yozuvi</Link>
            <Link href="/pairs">Juftliklar</Link>
          </div>
          <div className="col">
            <h3>Feekr</h3>
            <Link href="/about">Biz haqimizda</Link>
            <Link href="/blog">Jurnal</Link>
            <Link href="/license">Litsenziya</Link>
            <Link href="/support">Yordam</Link>
            <Link href="/maxfiylik">Maxfiylik</Link>
          </div>
          {visible.length > 0 && (
            <div className="col">
              <h3>Ijtimoiy</h3>
              {visible.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a>
              ))}
            </div>
          )}
        </div>
        <div className="footer-word" aria-hidden="true"><Wordmark /></div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Feekr · Toshkent, Oʻzbekiston</span>
          <span>Har bir oila oʻz muallifining litsenziyasi bilan · <Link href="/license">Shartlar</Link></span>
        </div>
      </div>
    </footer>
  );
}
