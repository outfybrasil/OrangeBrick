import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export async function GET() {
  const siteUrl = "https://orange-brick.vercel.app";

  let posts: { slug: string; updated_at: string }[] = [];

  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (data) {
      posts = data as { slug: string; updated_at: string }[];
    }
  } catch (err) {
    console.error("Error fetching posts for sitemap:", err);
  }

  const staticUrls = [
    { url: `${siteUrl}`, priority: "1.0", changefreq: "hourly" },
    { url: `${siteUrl}/brickboard`, priority: "0.8", changefreq: "daily" },
    { url: `${siteUrl}/institucional/termos`, priority: "0.2", changefreq: "yearly" },
    { url: `${siteUrl}/institucional/privacidade`, priority: "0.2", changefreq: "yearly" },
    { url: `${siteUrl}/institucional/anuncie`, priority: "0.4", changefreq: "monthly" },
  ];

  const postUrls = posts.map((post) => {
    const dateStr = post.updated_at ? new Date(post.updated_at).toISOString() : new Date().toISOString();
    return `  <url>
    <loc>${siteUrl}/posts/${post.slug}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  const staticXml = staticUrls
    .map(
      (item) => `  <url>
    <loc>${item.url}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join("\n");

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${postUrls.join("\n")}
</urlset>`;

  return new NextResponse(xmlContent, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
