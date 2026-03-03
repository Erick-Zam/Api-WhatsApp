import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    // Check if we are in production or local development mode
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/api/:path*',
        // En producción de Dokploy, la red interna de docker se llama "backend". En local usamos localhost.
        destination: isProd ? 'http://backend:3001/:path*' : 'http://localhost:3001/:path*'
      }
    ]
  }
};

export default nextConfig;
