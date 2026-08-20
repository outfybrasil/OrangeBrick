import { NextResponse } from "next/server";
import { createPublicServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function formatDateISO(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export async function GET() {
  const siteUrl = getSiteUrl();

  let posts: { slug: string; updated_at: string | null; topic_id: string | null }[] = [];
  let topics: { id: string; updated_at: string | null }[] = [];

  try {
    const supabase = createPublicServerClient();
    const [{ data }, { data: topicData }] = await Promise.all([
      supabase
        .from("posts")
        .select("slug, updated_at, topic_id")
        .eq("is_published", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("topics")
        .select("id, updated_at")
        .eq("is_active", true),
    ]);

    if (data) {
      posts = data as { slug: string; updated_at: string | null; topic_id: string | null }[];
    }
    if (topicData) {
      const publishedTopicIds = new Set(posts.map((p) => p.topic_id).filter(Boolean));
      topics = (topicData as { id: string; updated_at: string | null }[]).filter(
        (t) => !t.id.startsWith("catalog-") && publishedTopicIds.has(t.id)
      );
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
    { loc: `${siteUrl}/noticias`, priority: "0.9", changefreq: "hourly" },
    { loc: `${siteUrl}/em-alta`, priority: "0.8", changefreq: "hourly" },
    { loc: `${siteUrl}/lancamentos`, priority: "0.8", changefreq: "daily" },
    { loc: `${siteUrl}/brickboard`, priority: "0.8", changefreq: "hourly" },
    { loc: `${siteUrl}/brickboard/ranking`, priority: "0.5", changefreq: "daily" },
    { loc: `${siteUrl}/brickboard/conquistas`, priority: "0.5", changefreq: "weekly" },
    { loc: `${siteUrl}/brickboard/como-funciona`, priority: "0.5", changefreq: "monthly" },
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
    const formattedLastMod = formatDateISO(post.updated_at);
    if (formattedLastMod) {
      lines.push(`    <lastmod>${formattedLastMod}</lastmod>`);
    }
    lines.push(
      `    <changefreq>weekly</changefreq>`,
      `    <priority>0.8</priority>`,
      "  </url>");
  }

  for (const topic of topics) {
    lines.push("  <url>",
      `    <loc>${esc(`${siteUrl}/assuntos/${topic.id}`)}</loc>`);
    const formattedTopicLastMod = formatDateISO(topic.updated_at);
    if (formattedTopicLastMod) {
      lines.push(`    <lastmod>${formattedTopicLastMod}</lastmod>`);
    }
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
