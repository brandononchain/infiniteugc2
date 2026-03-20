import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Exclude backend-only files from Next.js compilation
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
  // Ignore TypeScript errors from Express backend files during Next.js build
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
