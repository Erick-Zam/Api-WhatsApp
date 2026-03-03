import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Fallback a ruta absoluta pública vía variable real de sistema o dominio público si falla la red docker
        destination: `${process.env.BACKEND_INTERNAL_URL || 'https://ws-api.erickvillon.dev'}/:path*`
      }
    ]
  }
};

export default nextConfig;
