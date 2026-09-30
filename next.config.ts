import type { NextConfig } from "next";

function imageRemotePatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
  const configuredHostnames = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter((hostname) => /^[a-z0-9.-]+$/.test(hostname));
  const hostnames = [
    "static.wikia.nocookie.net",
    "xboxwire.thesourcemediaassets.com",
    "tse1.mm.bing.net",
    "cdn.mos.cms.futurecdn.net",
    "variety.com",
    "www.adrenaline.com.br",
    "orange-brick.vercel.app",
    "lh3.googleusercontent.com",
    "live.staticflickr.com",
    ...configuredHostnames,
  ];
  const patterns: Array<{ protocol: "https"; hostname: string; pathname?: string }> = [...new Set(hostnames)].map((hostname) => ({
    protocol: "https" as const,
    hostname,
  }));

  if (supabaseHostname) {
    patterns.push({
      protocol: "https" as const,
      hostname: supabaseHostname,
      pathname: "/storage/v1/**",
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  serverExternalPackages: ["sharp"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: imageRemotePatterns(),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "orange-brick.vercel.app" }],
        destination: "https://orangebrick.blog/:path*",
        permanent: true,
      },
      { source: "/institucional/termos", destination: "/termos", permanent: true },
      { source: "/institucional/privacidade", destination: "/privacidade", permanent: true },
      { source: "/assuntos", destination: "/noticias", permanent: true },
      { source: "/profile/:nickname*", destination: "/u/:nickname*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
