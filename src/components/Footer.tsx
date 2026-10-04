import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";
import { getPublicCounts } from "@/lib/stats";
import { formatNumber } from "@/lib/format";

export default async function Footer() {
  const [{ socials }, { families }] = await Promise.all([getSiteSettings(), getPublicCounts()]);
  const visible = socials.filter((s) => s.enabled && s.url);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>Feekr</div>
            <p className="muted" style={{ maxWidth: 320, marginTop: 12, color: "rgba(255,255,255,.6)" }}>
              Bepul shriftlar kutubxonasi.{families > 0 ? ` ${formatNumber(families)} ta oila — hammasi bepul.` : ""}
            </p>
          </div>
          <div className="col">
            <h2>Shriftlar</h2>
            <Link href="/fonts">Barcha shriftlar</Link>
            <Link href="/pairs">Juftliklar</Link>
            <Link href="/fonts?cat=Sans">Sans-serif</Link>
            <Link href="/fonts?cat=Display">Display</Link>
            <Link href="/fonts?cat=Serif">Serif</Link>
          </div>
          <div className="col">
            <h2>Kompaniya</h2>
            <Link href="/about">Biz haqimizda</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/support">Yordam</Link>
            <Link href="/license">Litsenziya</Link>
          </div>
          {visible.length > 0 && (
            <div className="col">
              <h2>Ijtimoiy</h2>
              {visible.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a>
              ))}
            </div>
          )}
        </div>
        <div className="big">Feekr®</div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Feekr. Barcha huquqlar himoyalangan.</span>
          <span>Toshkent, Oʻzbekiston</span>
        </div>
      </div>
    </footer>
  );
}
