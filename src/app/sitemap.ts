import type { MetadataRoute } from "next";
import { createPublicServerClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orange-brick.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/institucional/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/institucional/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/institucional/anuncie`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const supabase = createPublicServerClient();
    const { data } = await supabase
      .from("posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (data) {
      for (const post of data as { slug: string; updated_at: string | null }[]) {
        entries.push({
          url: `${siteUrl}/posts/${post.slug}`,
          lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
    }
  } catch {
    // return static entries only
  }

  return entries;
}
