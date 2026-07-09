import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";

// Root-level catch-all: a completely unmatched URL (bad link, typo) bubbles up
// here since the (site) group's not-found.tsx only handles notFound() calls
// thrown from within its own pages, not routes that never matched at all.
// Renders the same site chrome as (site)/not-found.tsx so a mistyped URL
// doesn't look like a broken page.
export default function NotFound() {
  return (
    <StoreProvider>
      <Header />
      <main>
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
      </main>
      <Footer />
    </StoreProvider>
  );
}
