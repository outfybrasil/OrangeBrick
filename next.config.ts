import type { NextConfig } from "next";

function imageRemotePatterns() {
  const patterns: { protocol: "https"; hostname: string }[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;
  if (supabaseHost) {
    patterns.push({ protocol: "https", hostname: supabaseHost });
  } else {
    patterns.push({ protocol: "https", hostname: "*.supabase.co" });
  }
  for (const hostname of [
    "i.ytimg.com",
    "img.youtube.com",
    "assets.nintendo.com",
    "assets.nintendo.com.au",
    "image.api.playstation.com",
    "blog.playstation.com",
    "*.steamstatic.com",
    "store-images.s-microsoft.com",
    "xboxwire.thesourcemediaassets.com",
    "sm.ign.com",
    "static.wikia.nocookie.net",
    "cdn.prod.website-files.com",
    "prcdn.freetls.fastly.net",
    "channeln.gcdn.netmarble.com",
    "web-static.hg-cdn.com",
    "assets-cdn.daybreakgames.com",
    "lf16-fe-tos.bytedgame.com",
    "pbz.s-game.com",
    "cdn.box.co.uk",
    "encrypted-tbn0.gstatic.com",
    "th.bing.com",
    "aaagamestudios.com",
    "edia.co.jp",
    "www.cdprojekt.com",
    "www.gematsu.com",
    "www.konami.com",
    "www.notebookcheck.info",
    "www.rockstargames.com",
    "gameverse.com.ua",
    "rollingstone.com.br",
    "images.unsplash.com",
    "plus.unsplash.com",
    "images.pexels.com",
    "image.pollinations.ai",
  ]) {
    patterns.push({ protocol: "https", hostname });
  }
  return patterns;
}

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: imageRemotePatterns(),
  },
  async redirects() {
    return [
      { source: "/institucional/termos", destination: "/termos", permanent: true },
      { source: "/institucional/privacidade", destination: "/privacidade", permanent: true },
      { source: "/assuntos", destination: "/noticias", permanent: true },
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
