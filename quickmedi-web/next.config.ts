import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://api-lke8.onrender.com/'
  ],
};

export default nextConfig;
