import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.80.192.30", "macmini"], // tailscale remote IP
};

export default nextConfig;
