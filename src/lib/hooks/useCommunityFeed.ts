"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPost, CommunityPoll, CommunityComment, AttachedArticle, SharedPostData } from "@/lib/types/community";
import type { ReactionType, CommunityPostRow, CommunityReactionRow, CommunityCommentRow, CommunityPollRow, CommunityPollVoteRow } from "@/lib/types/database";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getGoogleAvatarUrl } from "@/lib/avatar";
import { invokeFunction } from "@/lib/supabase/functions";

interface UseCommunityFeedOptions {
  load?: boolean;
}

export function useCommunityFeed({ load = true }: UseCommunityFeedOptions = {}) {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [poll, setPoll] = useState<CommunityPoll | null>(null);
  const [isLoaded, setIsLoaded] = useState(!load);

  const sendCommunityPush = useCallback(async (
    eventType: "reaction" | "comment" | "repost" | "comment_like",
    referenceId: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await invokeFunction("send-push-notification", {
        event_type: eventType,
        reference_id: referenceId,
      }, { accessToken: session.access_token });
    } catch {
    }
  }, [supabase]);

  const fetchData = useCallback(async () => {
    try {
      const { data: postRows } = await supabase
        .from("community_posts")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      const userReactions: Record<string, ReactionType> = {};
      if (user) {
        try {
          const { data: reactions } = await supabase
            .from("community_reactions")
            .select("*")
            .eq("user_id", user.id);
          if (reactions) {
            for (const r of reactions as CommunityReactionRow[]) {
              userReactions[r.post_id] = r.reaction_type;
            }
          }
        } catch {
          // Fallback silencioso
        }
      }

      const reactionMap: Record<string, Record<ReactionType, number>> = {};
      try {
        const { data: allReactions } = await supabase
          .from("community_reactions")
          .select("*");
        if (allReactions) {
          for (const r of allReactions as CommunityReactionRow[]) {
            if (!reactionMap[r.post_id]) {
              reactionMap[r.post_id] = { hype: 0, flop: 0, salty: 0 };
            }
            reactionMap[r.post_id][r.reaction_type]++;
          }
        }
      } catch {
        // Fallback silencioso
      }

      const commentCountMap: Record<string, number> = {};
      try {
        const { data: allComments } = await supabase
          .from("community_comments")
          .select("*");
        if (allComments) {
          for (const c of allComments as CommunityCommentRow[]) {
            commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
          }
        }
      } catch {
        // Fallback silencioso
      }

      const shareCountMap: Record<string, number> = {};
      if (postRows) {
        for (const row of postRows as CommunityPostRow[]) {
          const article = row.attached_article as Record<string, unknown> | null;
          if (article && article._type === "shared_post") {
            const origId = article.original_post_id as string;
            shareCountMap[origId] = (shareCountMap[origId] || 0) + 1;
          }
        }
      }

      const mappedPosts: CommunityPost[] = (postRows as CommunityPostRow[] | null || []).map((row) => {
        const rawArticle = row.attached_article as Record<string, unknown> | null;
        let attachedArticle: AttachedArticle | null = null;
        let sharedPost: SharedPostData | null = null;

        if (rawArticle && rawArticle._type === "shared_post") {
          sharedPost = rawArticle as unknown as SharedPostData;
        } else if (rawArticle) {
          attachedArticle = rawArticle as unknown as AttachedArticle;
        }

        return {
          id: row.id,
          user_id: row.user_id,
          author_name: row.author_name,
          author_avatar: row.author_avatar,
          content: row.content,
          media_url: row.media_url,
          platform_tag: row.platform_tag,
          attached_article: attachedArticle,
          shared_post: sharedPost,
          reactions: reactionMap[row.id] || { hype: 0, flop: 0, salty: 0 },
          user_reaction: userReactions[row.id] || null,
          comments_count: commentCountMap[row.id] || 0,
          shares_count: shareCountMap[row.id] || 0,
          created_at: row.created_at,
          is_pinned: row.is_pinned,
          is_official: row.is_official,
        };
      });

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
    if (!load) return;
    queueMicrotask(() => void fetchData());
  }, [fetchData, load]);

  useEffect(() => {
    if (!load) return;
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
  }, [supabase, fetchData, load]);

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
        getGoogleAvatarUrl(user) ||
        "";

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

      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id !== postId) return p;

          const currentReaction = p.user_reaction;
          const newReactions = { ...p.reactions };

          if (currentReaction === reactionType) {
            newReactions[reactionType] = Math.max(0, (newReactions[reactionType] || 0) - 1);
            return { ...p, user_reaction: null, reactions: newReactions };
          } else {
            if (currentReaction) {
              newReactions[currentReaction] = Math.max(0, (newReactions[currentReaction] || 0) - 1);
            }
            newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
            return { ...p, user_reaction: reactionType, reactions: newReactions };
          }
        })
      );

      try {
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
            await supabase.from("community_reactions").delete().eq("id", existingRow.id);
            const { error } = await supabase.from("community_reactions").insert({
              post_id: postId,
              user_id: user.id,
              reaction_type: reactionType,
            });
            if (!error) await sendCommunityPush("reaction", postId);
          }
        } else {
          const { error } = await supabase.from("community_reactions").insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
          if (!error) await sendCommunityPush("reaction", postId);
        }
      } catch {
        fetchData();
      }
    },
    [user, supabase, fetchData, sendCommunityPush]
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

  const sharePost = useCallback(
    async (originalPost: CommunityPost, comment: string) => {
      if (!user) return;

      const authorName =
        profile?.nickname ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Leitor Orange Brick";

      const authorAvatar =
        profile?.avatar_url ||
        getGoogleAvatarUrl(user) ||
        "";

      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content: comment,
        attached_article: {
          _type: "shared_post",
          original_post_id: originalPost.id,
          original_author_name: originalPost.author_name,
          original_author_avatar: originalPost.author_avatar,
          original_content: originalPost.content,
          original_created_at: originalPost.created_at,
          original_platform_tag: originalPost.platform_tag || undefined,
          original_attached_article: originalPost.attached_article || undefined,
        },
      });
      if (!error) await sendCommunityPush("repost", originalPost.id);
    },
    [user, profile, supabase, sendCommunityPush]
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
        getGoogleAvatarUrl(user) ||
        "";

      const { error } = await supabase.from("community_comments").insert({
        post_id: postId,
        user_id: user.id,
        author_name: authorName,
        author_avatar: authorAvatar,
        content,
      });
      if (!error) await sendCommunityPush("comment", postId);
    },
    [user, profile, supabase, sendCommunityPush]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      await supabase.from("community_comments").delete().eq("id", commentId).eq("user_id", user.id);
    },
    [user, supabase]
  );

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user) return;

      try {
        const { data: existing } = await supabase
          .from("community_comment_likes")
          .select("*")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .maybeSingle();

        const existingRow = existing as { id: string } | null;

        if (existingRow) {
          await supabase.from("community_comment_likes").delete().eq("id", existingRow.id);
        } else {
          const { error } = await supabase.from("community_comment_likes").insert({
            comment_id: commentId,
            user_id: user.id,
          });
          if (!error) await sendCommunityPush("comment_like", commentId);
        }
      } catch {
      }
    },
    [user, supabase, sendCommunityPush]
  );

  const getComments = useCallback(
    async (postId: string): Promise<CommunityComment[]> => {
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      const rows = data as CommunityCommentRow[] | null;
      if (!rows || rows.length === 0) return [];

      const commentIds = rows.map((c) => c.id);
      const likesMap: Record<string, number> = {};
      const userLikesMap: Record<string, boolean> = {};

      try {
        const { data: likesData } = await supabase
          .from("community_comment_likes")
          .select("*")
          .in("comment_id", commentIds);

        if (likesData) {
          for (const l of likesData as Array<{ comment_id: string; user_id: string }>) {
            likesMap[l.comment_id] = (likesMap[l.comment_id] || 0) + 1;
            if (user && l.user_id === user.id) {
              userLikesMap[l.comment_id] = true;
            }
          }
        }
      } catch {
      }

      return rows.map((row) => ({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        author_name: row.author_name,
        author_avatar: row.author_avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        is_official: row.is_official,
        content: row.content,
        created_at: row.created_at,
        likes_count: likesMap[row.id] || 0,
        user_has_liked: userLikesMap[row.id] || false,
      }));
    },
    [supabase, user]
  );

  return {
    posts,
    poll,
    isLoaded,
    addPost,
    deletePost,
    sharePost,
    toggleReaction,
    votePoll,
    addComment,
    deleteComment,
    toggleCommentLike,
    getComments,
  };
}
