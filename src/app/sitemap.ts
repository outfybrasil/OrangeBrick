import type { MetadataRoute } from "next";
import { createPublicServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .returns<{ slug: string; updated_at: string }[]>();

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/brickboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/institucional/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/institucional/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/institucional/anuncie`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...staticPages,
    ...(data || []).map((post) => ({
      url: `${siteUrl}/posts/${post.slug}`,
      lastModified: post.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
