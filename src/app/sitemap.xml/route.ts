import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orange-brick.vercel.app";

  let posts: { slug: string; updated_at: string | null }[] = [];

  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (data) {
      posts = data as { slug: string; updated_at: string | null }[];
    }
  } catch {
    // serve static entries only
  }

  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];

  const staticEntries = [
    { loc: siteUrl, priority: "1.0", changefreq: "hourly" },
    { loc: `${siteUrl}/institucional/termos`, priority: "0.2", changefreq: "yearly" },
    { loc: `${siteUrl}/institucional/privacidade`, priority: "0.2", changefreq: "yearly" },
    { loc: `${siteUrl}/institucional/anuncie`, priority: "0.4", changefreq: "monthly" },
  ];

  for (const entry of staticEntries) {
    lines.push("  <url>",
      `    <loc>${esc(entry.loc)}</loc>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      "  </url>");
  }

  for (const post of posts) {
    lines.push("  <url>",
      `    <loc>${esc(`${siteUrl}/posts/${post.slug}`)}</loc>`);
    if (post.updated_at) {
      lines.push(`    <lastmod>${post.updated_at}</lastmod>`);
    }
    lines.push(
      `    <changefreq>weekly</changefreq>`,
      `    <priority>0.8</priority>`,
      "  </url>");
  }

  lines.push("</urlset>");

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
