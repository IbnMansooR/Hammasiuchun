import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreProvider from "@/components/StoreProvider";
import PreviewProvider from "@/components/PreviewProvider";
import SiteNotFound from "./(site)/not-found";

export const metadata = { title: "Sahifa topilmadi", robots: { index: false } };

// Root-level catch-all: a completely unmatched URL (bad link, typo) bubbles up
// here since the (site) group's not-found.tsx only handles notFound() calls
// thrown from within its own pages, not routes that never matched at all.
// Renders the same site chrome so a mistyped URL doesn't look like a broken page.
export default async function NotFound() {
  // Render per request (not prerendered): the CSP nonce from middleware must
  // match the page's scripts, or a static 404 would have all its JS blocked.
  await headers();
  return (
    <StoreProvider>
      <PreviewProvider>
        <a href="#main" className="skip-link">Asosiy qismga oʻtish</a>
        <Header />
        <main id="main" tabIndex={-1}><SiteNotFound /></main>
        <Footer />
      </PreviewProvider>
    </StoreProvider>
  );
}
