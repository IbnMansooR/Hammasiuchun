/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
