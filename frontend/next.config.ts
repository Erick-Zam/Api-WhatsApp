import type { NextConfig } from "next";

const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL || 'http://backend:3001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: `${backendInternalUrl}/api/admin/:path*`
      },
      {
        source: '/api/gdpr/:path*',
        destination: `${backendInternalUrl}/api/gdpr/:path*`
      },
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/:path*`
      }
    ]
  }
};

export default nextConfig;
