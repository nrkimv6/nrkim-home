import type { NextConfig } from "next";

const nextConfig: NextConfig  = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* config options here */
} as const;

export default nextConfig;
