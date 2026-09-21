import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "https://claude.ai/artifact/4Hhdi2DzQBaDLnsGzQ7aqe",
        permanent: false,
      },
    ];
  },
} as const;

export default nextConfig;
