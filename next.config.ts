import type { NextConfig } from "next";

/**
 * Baseline security headers for every response. No Content-Security-Policy yet: the playground
 * runs user code in a sandboxed iframe and the layout uses inline scripts, so a CSP needs its own
 * pass with nonces before it can be strict without breaking those.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // the Listen feature uses speech synthesis, which needs none of these
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    // the old /dashboard URL was renamed; keep every saved link and bookmark working
    return [
      { source: "/dashboard", destination: "/questions-answers", permanent: true },
      { source: "/dashboard/:path*", destination: "/questions-answers/:path*", permanent: true },
    ];
  },
  // the build fails on type errors, so a broken type never reaches production
  typescript: {
    ignoreBuildErrors: false,
  },
  // no ESLint config in this repo yet; `npm run typecheck` is the gate
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // only hosts the site actually loads (docbar slides); every extra host widens the image optimizer
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com", pathname: "/**" }],
  },
};

export default nextConfig;
