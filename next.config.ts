import type { NextConfig } from "next";

/**
 * @description Next.js application configuration.
 * Contains core settings for the build process.
 * @type {import('next').NextConfig}
 */
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
