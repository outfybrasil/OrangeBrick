import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 1800;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select("slug, title, published_at")
    .eq("is_published", true)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(1000);
  const posts = (data || []) as Array<{ slug: string; title: string; published_at: string | null }>;

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
  ];

  for (const post of posts) {
    if (!post.published_at) continue;
    lines.push(
      "  <url>",
      `    <loc>${escapeXml(`${siteUrl}/posts/${post.slug}`)}</loc>`,
      "    <news:news>",
      "      <news:publication>",
      "        <news:name>Orange Brick</news:name>",
      "        <news:language>pt</news:language>",
      "      </news:publication>",
      `      <news:publication_date>${escapeXml(post.published_at)}</news:publication_date>`,
      `      <news:title>${escapeXml(post.title)}</news:title>`,
      "    </news:news>",
      "  </url>",
    );
  }

  lines.push("</urlset>");
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
