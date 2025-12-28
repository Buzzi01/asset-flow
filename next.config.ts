import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // 👇 MUDANÇA AQUI: De '127.0.0.1' para 'backend'
        destination: 'http://backend:5328/api/:path*', 
      },
    ];
  },
};

export default nextConfig;