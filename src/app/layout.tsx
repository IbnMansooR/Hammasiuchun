import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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
  icons: {
    icon: [{ url: "/assets/icon.svg", type: "image/svg+xml" }, { url: "/assets/favicon.png", type: "image/png" }],
    apple: "/assets/favicon.png",
  },
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

// Applies a saved light/dark choice before first paint (no flash). Admin stays light.
const THEME_SCRIPT = `try{var d=document.documentElement;if(location.pathname.indexOf('/admin')===0){d.dataset.theme='light'}else{var t=localStorage.getItem('feekr_theme');if(t==='dark'||t==='light')d.dataset.theme=t}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Above-the-fold type on every page — fetch it early.
  preload("/fonts/ui/inter-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/fonts/ui/feekr-display.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        {/* Browsers blank out the nonce attribute after parsing — expected, not a mismatch. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
