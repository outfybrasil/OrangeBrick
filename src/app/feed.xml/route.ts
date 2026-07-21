import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";

export const revalidate = 1800;

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  "\"": "&quot;",
}[character] || character));

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select("slug, title, summary, published_at, author_name")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(30)
    .returns<Pick<Post, "slug" | "title" | "summary" | "published_at" | "author_name">[]>();

  const items = (data || []).map((post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <guid>${siteUrl}/posts/${post.slug}</guid>
      <description>${escapeXml(post.summary)}</description>
      <author>${escapeXml(post.author_name)}</author>
      <pubDate>${new Date(post.published_at || 0).toUTCString()}</pubDate>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0"><channel>
    <title>Orange Brick</title>
    <link>${siteUrl}</link>
    <description>Notícias de games, hardware, indústria e modding.</description>
    <language>pt-BR</language>${items}
  </channel></rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
