import type { NextConfig } from "next";

/**
 * Next.js application configuration.
 * @type {import('next').NextConfig}
 */
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
