import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://orange-brick.vercel.app");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/post"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
