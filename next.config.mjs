/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: nobody may frame the site (login/cart/admin included).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Browsers/bots request /favicon.ico regardless of <link rel="icon">.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/assets/favicon.png" }];
  },
  // Admin uploads (font families = several TTF/OTF files, cover photos) routinely
  // exceed the 1 MB default server-action body cap. Raise it so uploads work.
  experimental: {
    serverActions: { bodySizeLimit: "100mb" },
  },
  // The font-source library (font/) and the raw dump (Jama fonts) contain tens of
  // thousands of files. Keep the dev-server watcher away from them so HMR stays fast.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/font/**",
          "**/.git/**",
          "**/data/records.jsonl",
        ],
      };
    }
    return config;
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
