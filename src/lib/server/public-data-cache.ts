import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/server";
import { POST_LIST_COLUMNS, type Post, type ReleaseRadarItem } from "@/lib/types/database";

export const PUBLIC_POSTS_TAG = "public-posts";
export const PUBLIC_RELEASES_TAG = "public-releases";

type HypeRow = { release_id: string; vote_type: string; vote_count: number };

const latestPublishedPosts = unstable_cache(
  async (limit: number) => {
    const { data, error } = await createPublicServerClient()
      .from("posts")
      .select(POST_LIST_COLUMNS)
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as unknown as Post[] | null) || [];
  },
  ["latest-published-posts"],
  { revalidate: 120, tags: [PUBLIC_POSTS_TAG] },
);

const activeReleaseItems = unstable_cache(
  async () => {
    const { data, error } = await createPublicServerClient()
      .from("release_radar_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as unknown as ReleaseRadarItem[] | null) || [];
  },
  ["active-release-items"],
  { revalidate: 300, tags: [PUBLIC_RELEASES_TAG] },
);

const releaseHypeCounts = unstable_cache(
  async () => {
    const { data, error } = await createPublicServerClient().rpc("get_release_hype_counts");
    if (error) throw new Error(error.message);
    return (data || []) as HypeRow[];
  },
  ["release-hype-counts"],
  { revalidate: 60, tags: [PUBLIC_RELEASES_TAG] },
);

export async function getLatestPublishedPosts(limit: number): Promise<Post[]> {
  try {
    return await latestPublishedPosts(limit);
  } catch {
    return [];
  }
}

export async function getActiveReleaseItems(): Promise<ReleaseRadarItem[]> {
  try {
    return await activeReleaseItems();
  } catch {
    return [];
  }
}

export async function getReleaseHypeCounts(): Promise<HypeRow[] | null> {
  try {
    return await releaseHypeCounts();
  } catch {
    return null;
  }
}
