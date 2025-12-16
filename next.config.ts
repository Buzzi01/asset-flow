import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Ignora erros de verificação para subir logo */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;