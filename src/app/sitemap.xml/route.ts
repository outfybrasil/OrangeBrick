import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const siteUrl = getSiteUrl();

  let posts: { slug: string; updated_at: string | null }[] = [];
  let topics: { id: string; updated_at: string | null }[] = [];

  try {
    const supabase = createPublicServerClient();
    const [{ data }, { data: topicData }] = await Promise.all([
      supabase
        .from("posts")
        .select("slug, updated_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("topics")
        .select("id, updated_at")
        .eq("is_active", true),
    ]);

    if (data) {
      posts = data as { slug: string; updated_at: string | null }[];
    }
    if (topicData) {
      topics = topicData as { id: string; updated_at: string | null }[];
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
    { loc: `${siteUrl}/brickboard`, priority: "0.8", changefreq: "hourly" },
    { loc: `${siteUrl}/brickboard/ranking`, priority: "0.5", changefreq: "daily" },
    { loc: `${siteUrl}/brickboard/conquistas`, priority: "0.5", changefreq: "weekly" },
    { loc: `${siteUrl}/brickboard/como-funciona`, priority: "0.5", changefreq: "monthly" },
    { loc: `${siteUrl}/lancamentos`, priority: "0.8", changefreq: "daily" },
    { loc: `${siteUrl}/assuntos`, priority: "0.7", changefreq: "daily" },
    { loc: `${siteUrl}/sobre`, priority: "0.5", changefreq: "monthly" },
    { loc: `${siteUrl}/plataforma/playstation`, priority: "0.6", changefreq: "daily" },
    { loc: `${siteUrl}/plataforma/xbox`, priority: "0.6", changefreq: "daily" },
    { loc: `${siteUrl}/plataforma/nintendo`, priority: "0.6", changefreq: "daily" },
    { loc: `${siteUrl}/plataforma/pc`, priority: "0.6", changefreq: "daily" },
    { loc: `${siteUrl}/plataforma/mobile`, priority: "0.6", changefreq: "daily" },
    { loc: `${siteUrl}/termos`, priority: "0.2", changefreq: "yearly" },
    { loc: `${siteUrl}/privacidade`, priority: "0.2", changefreq: "yearly" },
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

  for (const topic of topics) {
    lines.push("  <url>",
      `    <loc>${esc(`${siteUrl}/assuntos/${topic.id}`)}</loc>`);
    if (topic.updated_at) lines.push(`    <lastmod>${topic.updated_at}</lastmod>`);
    lines.push(
      `    <changefreq>daily</changefreq>`,
      `    <priority>0.6</priority>`,
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
