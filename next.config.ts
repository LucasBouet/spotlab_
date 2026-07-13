import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // yt-dlp-exec locates its downloaded binary relative to its own
  // __dirname at runtime — bundling it rewrites __dirname to a synthetic
  // build-time path (seen as a bogus "/ROOT/..." binary path), so it must
  // be excluded from the server bundle and loaded via a real require()
  // from node_modules instead.
  serverExternalPackages: ["yt-dlp-exec"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.dzcdn.net",
      },
    ],
  },
};

export default nextConfig;
