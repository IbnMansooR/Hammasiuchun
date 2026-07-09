import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container section" style={{ paddingTop: 60, textAlign: "center" }}>
      <div className="eyebrow" style={{ justifyContent: "center" }}>404</div>
      <h1 style={{ fontSize: "clamp(34px,6vw,72px)", marginBottom: 14 }}>Sahifa topilmadi</h1>
      <p className="muted" style={{ fontSize: 18, maxWidth: 460, margin: "0 auto 26px" }}>
        Bunday sahifa mavjud emas yoki koʻchirilgan. Balki qidirayotgan shriftingiz katalogda bordir.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <Link href="/fonts" className="btn btn-accent">Barcha shriftlar</Link>
        <Link href="/" className="btn">Bosh sahifa</Link>
      </div>
    </div>
  );
}
