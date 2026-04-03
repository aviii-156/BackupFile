import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
    experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "https://api-lke8.onrender.com/", "http://localhost:5000"],
    },
  },
};

export default nextConfig;
