import type { NextConfig } from "next";

const nextConfig: NextConfig  = {
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
} as const;

export default nextConfig;
