import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Ensure @/ path alias resolves to src/ in all build environments
  turbopack: {
    resolveAlias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: [
    "sharp",
    "fluent-ffmpeg",
    "@remotion/bundler",
    "@remotion/cli",
    "@remotion/renderer",
    "remotion",
    "@aws-sdk/client-lambda",
    "@aws-sdk/client-sqs",
  ],
};

export default nextConfig;
