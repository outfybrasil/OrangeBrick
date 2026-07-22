"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPost, CommunityPoll, CommunityComment, AttachedArticle } from "@/lib/types/community";
import type { ReactionType, CommunityPostRow, CommunityReactionRow, CommunityCommentRow, CommunityPollRow, CommunityPollVoteRow } from "@/lib/types/database";
import { useAuth } from "@/lib/contexts/AuthContext";

export function useCommunityFeed() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [poll, setPoll] = useState<CommunityPoll | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data: postRows } = await supabase
        .from("community_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      let userReactions: Record<string, ReactionType> = {};
      if (user) {
        const { data: reactions } = await supabase
          .from("community_reactions")
          .select("*")
          .eq("user_id", user.id);
        if (reactions) {
          for (const r of reactions as CommunityReactionRow[]) {
            userReactions[r.post_id] = r.reaction_type;
          }
        }
      }

      const { data: allReactions } = await supabase
        .from("community_reactions")
        .select("*");

      const reactionMap: Record<string, Record<ReactionType, number>> = {};
      if (allReactions) {
        for (const r of allReactions as CommunityReactionRow[]) {
          if (!reactionMap[r.post_id]) {
            reactionMap[r.post_id] = { hype: 0, flop: 0, salty: 0 };
          }
          reactionMap[r.post_id][r.reaction_type]++;
        }
      }

      const { data: allComments } = await supabase
        .from("community_comments")
        .select("*");

      const commentCountMap: Record<string, number> = {};
      if (allComments) {
        for (const c of allComments as CommunityCommentRow[]) {
          commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
        }
      }

      const mappedPosts: CommunityPost[] = (postRows as CommunityPostRow[] | null || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        author_name: row.author_name,
        author_avatar: row.author_avatar,
        content: row.content,
        media_url: row.media_url,
        platform_tag: row.platform_tag,
        attached_article: row.attached_article as AttachedArticle | null,
        reactions: reactionMap[row.id] || { hype: 0, flop: 0, salty: 0 },
        user_reaction: userReactions[row.id] || null,
        comments_count: commentCountMap[row.id] || 0,
        created_at: row.created_at,
        is_pinned: row.is_pinned,
      }));

      setPosts(mappedPosts);

      const { data: pollRows } = await supabase
        .from("community_polls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pollRows) {
        const pollRow = pollRows as CommunityPollRow;
        let userVotedOption: number | undefined;
        if (user) {
          const { data: vote } = await supabase
            .from("community_poll_votes")
            .select("*")
            .eq("poll_id", pollRow.id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (vote) {
            userVotedOption = (vote as CommunityPollVoteRow).option_index;
          }
        }

        const { data: allVotes } = await supabase
          .from("community_poll_votes")
          .select("*")
          .eq("poll_id", pollRow.id);

        const voteCounts: Record<number, number> = {};
        if (allVotes) {
          for (const v of allVotes as CommunityPollVoteRow[]) {
            voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1;
          }
        }

        const rawOptions = pollRow.options as Array<{ id: number; text: string }>;
        const options = rawOptions.map((opt) => ({
          ...opt,
          votes: voteCounts[opt.id] || 0,
        }));

        setPoll({
          id: pollRow.id,
          question: pollRow.question,
          options,
          total_votes: allVotes?.length || 0,
          user_voted_option: userVotedOption ?? null,
          created_at: pollRow.created_at,
        });
      }
    } catch (err) {
      console.error("Failed to load community data:", err);
    } finally {
      setIsLoaded(true);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channelName = `community_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          if (
            payload.table === "community_posts" ||
            payload.table === "community_reactions" ||
            payload.table === "community_poll_votes"
          ) {
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  const addPost = useCallback(
    async (content: string, platformTag?: string, attachedArticle?: AttachedArticle, mediaUrl?: string) => {
      if (!user) return;

      const authorName =
        profile?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Leitor Orange Brick";

      const authorAvatar =
        profile?.avatar_url ||
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

      await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content,
        platform_tag: platformTag || null,
        attached_article: attachedArticle || null,
        media_url: mediaUrl || null,
      });
    },
    [user, profile, supabase]
  );

  const toggleReaction = useCallback(
    async (postId: string, reactionType: ReactionType) => {
      if (!user) return;

      const { data: existing } = await supabase
        .from("community_reactions")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      const existingRow = existing as CommunityReactionRow | null;

      if (existingRow) {
        if (existingRow.reaction_type === reactionType) {
          await supabase.from("community_reactions").delete().eq("id", existingRow.id);
        } else {
          await supabase.from("community_reactions").update({ reaction_type: reactionType }).eq("id", existingRow.id);
        }
      } else {
        await supabase.from("community_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }
    },
    [user, supabase]
  );

  const votePoll = useCallback(
    async (optionId: number) => {
      if (!user || !poll) return;

      await supabase.from("community_poll_votes").insert({
        poll_id: poll.id,
        user_id: user.id,
        option_index: optionId,
      });
    },
    [user, poll, supabase]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      await supabase.from("community_posts").delete().eq("id", postId).eq("user_id", user.id);
    },
    [user, supabase]
  );

  const addComment = useCallback(
    async (postId: string, content: string) => {
      if (!user) return;

      const authorName =
        profile?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Leitor Orange Brick";

      const authorAvatar =
        profile?.avatar_url ||
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

      await supabase.from("community_comments").insert({
        post_id: postId,
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content,
      });
    },
    [user, profile, supabase]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      await supabase.from("community_comments").delete().eq("id", commentId).eq("user_id", user.id);
    },
    [user, supabase]
  );

  const getComments = useCallback(
    async (postId: string): Promise<CommunityComment[]> => {
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      return (data as CommunityCommentRow[] | null || []).map((row) => ({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        author_name: row.author_name,
        author_avatar: row.author_avatar,
        content: row.content,
        created_at: row.created_at,
      }));
    },
    [supabase]
  );

  return {
    posts,
    poll,
    isLoaded,
    addPost,
    deletePost,
    toggleReaction,
    votePoll,
    addComment,
    deleteComment,
    getComments,
  };
}
