import type { SupabaseClient } from "@supabase/supabase-js";
import type { FlexibleDatabase } from "@/lib/supabase/client";

export interface CommunityCommentLikeSummary {
  comment_id: string;
  likes_count: number;
  user_has_liked: boolean;
}

export async function getCommunityCommentLikeSummaries(
  supabase: SupabaseClient<FlexibleDatabase>,
  commentIds: string[]
): Promise<CommunityCommentLikeSummary[]> {
  const uniqueCommentIds = [...new Set(commentIds)];
  const summaries: CommunityCommentLikeSummary[] = [];

  for (let index = 0; index < uniqueCommentIds.length; index += 200) {
    const { data, error } = await supabase.rpc("get_community_comment_like_summaries", {
      target_comment_ids: uniqueCommentIds.slice(index, index + 200),
    });

    if (error) throw error;
    summaries.push(...(data ?? []));
  }

  return summaries;
}
