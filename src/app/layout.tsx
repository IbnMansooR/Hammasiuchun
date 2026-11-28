import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { preload } from "react-dom";
import { SITE_URL } from "@/lib/site";
import { getSiteSettingsCached } from "@/lib/settings";
import { getLocale } from "@/i18n/server";
import { OG_LOCALE } from "@/i18n/config";
import { DICTS } from "@/i18n/dict";
import "./globals.css";

const BASE_METADATA: Metadata = {
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

// Search engine ownership tags come from Admin → Sozlamalar, so they can be added without a redeploy.
export async function generateMetadata(): Promise<Metadata> {
  const [s, locale] = await Promise.all([getSiteSettingsCached().catch(() => null), getLocale()]);
  const verification = {
    ...(s?.googleVerification ? { google: s.googleVerification } : {}),
    ...(s?.yandexVerification ? { yandex: s.yandexVerification } : {}),
  };
  const m = DICTS[locale].meta;
  const base: Metadata =
    locale === "uz"
      ? BASE_METADATA
      : {
          ...BASE_METADATA,
          title: { default: m.title, template: "%s — Feekr" },
          description: m.description,
          openGraph: { ...BASE_METADATA.openGraph, locale: OG_LOCALE[locale], title: m.title, description: m.ogDescription },
        };
  return Object.keys(verification).length ? { ...base, verification } : base;
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

// Applies a saved light/dark choice before first paint (no flash). The admin follows the same choice.
// It also registers, before anything else runs, a listener that counts React hydration errors (#418, #423, #425)
// as the "client_error" event: they are recoverable and invisible to visitors, so this is how we learn how often they happen.
const THEME_SCRIPT = `try{var t=localStorage.getItem('feekr_theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}try{addEventListener('error',function(e){var m=String(e&&e.message||'');if(/#(418|423|425)\\b|ydrat/.test(m))navigator.sendBeacon('/api/track',new Blob([JSON.stringify({n:'client_error',p:location.pathname,m:'hydration'})],{type:'application/json'}))})}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  // Above-the-fold type on every page — fetch it early.
  preload("/fonts/ui/inter-latin.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/fonts/ui/feekr-display.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  if (locale === "ru") {
    preload("/fonts/ui/inter-cyrillic.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
    preload("/fonts/ui/lora-cyrillic.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Browsers blank out the nonce attribute after parsing — expected, not a mismatch. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
