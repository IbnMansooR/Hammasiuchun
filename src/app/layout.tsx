import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Feekr — Mustaqil shrift ombori",
    template: "%s — Feekr",
  },
  description:
    "Feekr — dizaynerlar va brendlar uchun mustaqil shrift ombori. 2000+ shrift oilasi, bepul demo va litsenziyalar.",
  icons: { icon: "/assets/favicon.png" },
  openGraph: {
    type: "website",
    siteName: "Feekr",
    locale: "uz_UZ",
    title: "Feekr — Mustaqil shrift ombori",
    description: "2000+ shrift oilasi, bepul demo va litsenziyalar.",
    // Placeholder share image (square logo) until a 1200×630 card is designed.
    images: [{ url: "/assets/logo-full.png", width: 1080, height: 1081, alt: "Feekr" }],
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#0ea472",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The Latin subset of the UI font is needed on every page — fetch it early.
  preload("/fonts/montserrat/montserrat-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
