import Link from "next/link";
import { IconArrow } from "@/components/Icons";

export const metadata = { title: "Sahifa topilmadi", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container">
      <div className="empty" style={{ paddingBlock: "96px 40px" }}>
        <div className="display" style={{ fontSize: "clamp(120px, 22vw, 280px)", lineHeight: .85, color: "var(--accent)" }} aria-hidden="true">404</div>
        <h1 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "8px 0 16px" }}>Sahifa topilmadi</h1>
        <p>Bunday sahifa mavjud emas yoki koʻchirilgan. Balki qidirayotgan shriftingiz katalogda bordir.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <Link href="/fonts" className="btn btn-accent btn-lg">Shriftlarni koʻrish <IconArrow className="ico" /></Link>
          <Link href="/" className="btn btn-lg">Bosh sahifa</Link>
        </div>
      </div>
    </div>
  );
}
