import { allowRequest, handleOptions, isUuid, json, serve, serviceClient } from "../_shared/platform.ts";
import { createPostStatsHandler, type PostStatsRow } from "../../../src/lib/server/post-stats-handler.ts";

async function loadStats(postIds: string[], deviceId: string | null): Promise<PostStatsRow[]> {
  const supabase = serviceClient();
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id")
    .in("id", postIds)
    .eq("is_published", true);
  if (postsError) throw postsError;

  const publishedIds = (posts || []).map((post) => post.id);
  if (publishedIds.length === 0) return [];

  const { data, error } = await supabase.rpc("get_post_stats", {
    p_post_ids: publishedIds,
    p_device_id: deviceId,
  });
  if (error) throw error;
  return (data || []) as PostStatsRow[];
}

serve(createPostStatsHandler({ allowRequest, handleOptions, isUuid, json, loadStats }));
