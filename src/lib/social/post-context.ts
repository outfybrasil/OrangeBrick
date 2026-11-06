import type { SupabaseClient } from "@supabase/supabase-js";
import { getSiteUrl } from "../site-url.ts";
import { socialPostAssets, type SocialSourcePost } from "./post-plan.ts";

export async function enrichSocialPost(db: SupabaseClient, post: SocialSourcePost): Promise<SocialSourcePost> {
  const imageSources: Record<string, string> = {};
  const urls = socialPostAssets(post).map(asset => asset.url);
  for (let offset = 0; offset < urls.length; offset += 20) {
    try {
      const { data, error } = await db.from("editorial_images").select("public_url,source_url").in("public_url", urls.slice(offset, offset + 20));
      if (!error) for (const row of data || []) {
        if (typeof row.public_url !== "string" || typeof row.source_url !== "string") continue;
        const source = new URL(row.source_url);
        if (source.protocol === "https:" && !source.username && !source.password) imageSources[row.public_url] = source.href;
      }
    } catch {}
  }
  return { ...post, imageSources, siteUrl: getSiteUrl() };
}
