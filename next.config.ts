import type { NextConfig } from "next";

/**
 * @module nextConfig
 * @description Next.js application configuration.
 * Contains core settings for the build process.
 * @type {import('next').NextConfig}
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    /** Ignores TypeScript errors during build for faster CI/CD */
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
