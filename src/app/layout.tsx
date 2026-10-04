import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Feekr — Bepul shriftlar kutubxonasi",
    template: "%s — Feekr",
  },
  description:
    "Feekr — dizaynerlar va brendlar uchun bepul shriftlar kutubxonasi. Oʻzbek lotin va kirill yozuvini qoʻllab-quvvatlaydigan shriftlar, sinab koʻrish va bir bosishda yuklab olish.",
  icons: { icon: "/assets/favicon.png" },
  openGraph: {
    type: "website",
    siteName: "Feekr",
    locale: "uz_UZ",
    title: "Feekr — Bepul shriftlar kutubxonasi",
    description: "Bepul shriftlar: sinab koʻring va bir bosishda yuklab oling.",
    // og:image comes from app/opengraph-image.tsx (and a per-font one under /fonts/[slug]).
  },
  twitter: { card: "summary_large_image" },
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
