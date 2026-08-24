import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // Same-origin /api/* → Fastify (avoids CORS; cookies stay first-party).
    const api = process.env.API_URL ?? "http://127.0.0.1:4000";
    return [{ source: "/api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
