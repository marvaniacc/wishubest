/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // The API is same-origin at /api (Caddy strips prefix). No rewrites needed in prod.
  async rewrites() {
    // In dev, proxy /api/* to the local API server to avoid CORS.
    const apiUrl = process.env.API_PROXY_URL;
    if (!apiUrl) return [];
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
