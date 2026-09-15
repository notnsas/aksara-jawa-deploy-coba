import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-linux-x64-gnu",
    "@tailwindcss/oxide",
    "@tailwindcss/oxide-linux-x64-gnu",
  ],
};

export default nextConfig;