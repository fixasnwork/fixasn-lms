import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Production CSP — strict; no `unsafe-eval`, inline scripts limited to
// Next.js's nonce-friendly defaults. `frame-src` allows YouTube embeds
// for the Video Pembelajaran player.
const prodCsp = [
  "default-src 'self'",
  // YouTube's iframe API script URL matches the page's protocol (http
  // or https) per youtube-player/dist/loadYouTubeIframeApi.js, so we
  // list both schemes. The script is loaded from the YouTube domain
  // either way.
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.youtube.com http://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://accounts.google.com https://*.supabase.co",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

// Dev CSP — adds `'unsafe-eval'` for Turbopack HMR / Next.js dev tooling.
// Only applied when NODE_ENV !== 'production'.
const devCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.youtube.com http://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://accounts.google.com https://*.supabase.co ws:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const cspHeader = isDev ? devCsp : prodCsp;

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  output: "standalone",
  // Mark native-binding server packages as external so Turbopack does
  // not try to bundle the .node binaries. These are loaded at runtime
  // via require(); the bundler must leave them alone.
  serverExternalPackages: [
    "@napi-rs/canvas", // PDF page rasterization (lib/pdfPageRender.ts)
    "pdfjs-dist",       // PDF parser (transitive via pdf-to-img)
    "pdf-to-img",       // PDF wrapper; uses dynamic require() on pdfjs-dist
    "sharp",            // PDF watermark compositing (lib/pdfWatermark.ts)
  ],
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: [
    "100.80.192.30",
    "macmini",
    "macmini.ling-antares.ts.net",
  ], // tailscale remote IPs
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
        ],
      },
    ];
  },
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
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

export default nextConfig;
