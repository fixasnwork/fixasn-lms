import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: ["100.80.192.30", "macmini"], // tailscale remote IP
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "google.com",
      },
    ],
  },
};

export default nextConfig;
