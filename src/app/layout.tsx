import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://feekr.uz";

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
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0ea472",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
