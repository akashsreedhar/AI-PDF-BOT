import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Allow larger multipart uploads to pass through the /api rewrite proxy.
    proxyClientMaxBodySize: '50mb',
  },
  async rewrites() {
    const apiTarget = process.env.API_BASE_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
