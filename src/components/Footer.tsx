import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";

export default async function Footer() {
  const { socials } = await getSiteSettings();
  const visible = socials.filter((s) => s.enabled && s.url);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.03em" }}>Feekr</div>
            <p className="muted" style={{ maxWidth: 320, marginTop: 12, color: "rgba(255,255,255,.6)" }}>
              Mustaqil shrift ombori. Dizaynerlar va brendlar uchun 2000+ oila.
            </p>
          </div>
          <div className="col">
            <h4>Shriftlar</h4>
            <Link href="/fonts">Barcha shriftlar</Link>
            <Link href="/pairs">Juftliklar</Link>
            <Link href="/fonts?cat=Sans">Sans-serif</Link>
            <Link href="/fonts?cat=Display">Display</Link>
            <Link href="/fonts?cat=Serif">Serif</Link>
          </div>
          <div className="col">
            <h4>Kompaniya</h4>
            <Link href="/about">Biz haqimizda</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/support">Yordam</Link>
            <Link href="/license">Litsenziya</Link>
          </div>
          {visible.length > 0 && (
            <div className="col">
              <h4>Ijtimoiy</h4>
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
