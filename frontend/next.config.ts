import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Use docker internal network URL, fallback to localhost for local dev
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001'}/:path*`
      }
    ]
  }
};

export default nextConfig;
