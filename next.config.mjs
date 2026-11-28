/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: nobody may frame the site. (The full CSP, incl. frame-ancestors,
  // is set per request with a nonce in src/middleware.ts.)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Pages opened from the site can't reach back into it (Telegram's login popup still works).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // subset-font loads HarfBuzz's wasm via require.resolve() + readFile at run
  // time; bundling would turn that path into a module id. Keep it external so
  // it runs from node_modules (and output tracing ships the .wasm).
  serverExternalPackages: ["subset-font"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The section was briefly published as /portfolio before being renamed.
  async redirects() {
    return [
      { source: "/portfolio", destination: "/dizaynerlar", permanent: true },
      { source: "/portfolio/:slug", destination: "/dizaynerlar/:slug", permanent: true },
    ];
  },
  // Browsers/bots request /favicon.ico regardless of <link rel="icon">.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/assets/favicon.png" }];
  },
  // The OG image routes read these WOFFs from disk at request time — make sure
  // they're bundled with the serverless functions.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/_og/*.woff"],
    "/fonts/[slug]/opengraph-image": ["./src/app/_og/*.woff"],
  },
  // Admin uploads (font families = several TTF/OTF files, cover photos) routinely
  // exceed the 1 MB default server-action body cap. Raise it so uploads work.
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
