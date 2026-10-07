"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPost, CommunityPoll, CommunityComment, AttachedArticle, SharedPostData } from "@/lib/types/community";
import type { ReactionType, CommunityPostRow, CommunityReactionRow, CommunityCommentRow, CommunityPollRow } from "@/lib/types/database";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getGoogleAvatarUrl } from "@/lib/avatar";
import { invokeFunction } from "@/lib/supabase/functions";
import { getCommunityErrorMessage } from "@/lib/community-errors";
import { getCommunityCommentLikeSummaries } from "@/lib/community-comment-likes";

interface UseCommunityFeedOptions {
  load?: boolean;
  search?: string;
  platform?: string;
  article?: string | null;
  topic?: string | null;
  post?: string | null;
  order?: "latest" | "following" | "trending";
}

interface CommunityPollResults {
  counts: Record<string, number>;
  total_votes: number;
  user_voted_option: number | null;
}

function ownCommunityMediaPath(publicUrl: string | null, userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicUrl || !supabaseUrl) return null;

  try {
    const url = new URL(publicUrl);
    const supabaseOrigin = new URL(supabaseUrl).origin;
    const marker = `/storage/v1/object/public/profile-images/${userId}/`;
    const filename = url.pathname.slice(marker.length);
    if (
      url.origin !== supabaseOrigin
      || url.protocol !== "https:"
      || !url.pathname.startsWith(marker)
      || !/^brick-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i.test(filename)
      || url.search
      || url.hash
    ) return null;
    return `${userId}/${filename}`;
  } catch {
    return null;
  }
}

export function useCommunityFeed({ load = true, search = "", platform = "", article = null, topic = null, post = null, order = "latest" }: UseCommunityFeedOptions = {}) {
  const { user, profile } = useAuth();
  const userId = user?.id;
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [poll, setPoll] = useState<CommunityPoll | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [pollVoteError, setPollVoteError] = useState<string | null>(null);
  const pollVotePendingRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(!load);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const isMountedRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageOffsetRef = useRef(0);
  const feedPendingRef = useRef(false);
  const feedVersionRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const fetchData = useCallback(async (showLoading = false, append = false) => {
    if (append && feedPendingRef.current) return;
    feedPendingRef.current = true;
    const requestVersion = ++feedVersionRef.current;
    if (append) setIsLoadingMore(true);
    setLoadError(null);
    if (showLoading) setIsLoaded(false);
    try {
      const { data: result, error: postsError } = await supabase.rpc("community_feed_page", {
        page_offset: append ? pageOffsetRef.current : 0,
        search_text: search.trim(),
        platform_filter: platform,
        article_filter: article || "",
        topic_filter: topic || "",
        post_filter: post || "",
        feed_order: order,
      });
      if (postsError) throw postsError;
      if (requestVersion !== feedVersionRef.current) return;
      const page = result as unknown as { posts: Array<CommunityPostRow & { reactions: Record<ReactionType, number>; user_reaction: ReactionType | null; comments_count: number; shares_count: number }>; has_more: boolean };
      if (!page || !Array.isArray(page.posts)) throw new Error("Resposta inválida ao carregar conversas.");
      const postRows = page.posts;

      const mappedPosts: CommunityPost[] = postRows.map((row) => {
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
          author_username: row.author_username,
          author_avatar: row.author_avatar,
          content: row.content,
          media_url: row.media_url,
          media_alt: row.media_alt,
          platform_tag: row.platform_tag,
          attached_article: attachedArticle,
          shared_post: sharedPost,
          reactions: row.reactions,
          user_reaction: row.user_reaction,
          comments_count: row.comments_count,
          shares_count: row.shares_count,
          created_at: row.created_at,
          is_pinned: row.is_pinned,
          is_official: row.is_official,
          topic_id: row.topic_id,
          source_post_id: row.source_post_id,
          is_official_thread: row.is_official_thread,
        };
      });

      if (!isMountedRef.current || requestVersion !== feedVersionRef.current) return;
      setPosts((current) => append ? [...current, ...mappedPosts.filter((item) => !current.some((existing) => existing.id === item.id))] : mappedPosts);
      pageOffsetRef.current = (append ? pageOffsetRef.current : 0) + mappedPosts.length;
      setHasMore(page.has_more);
      if (append) return;

      const { data: pollRows, error: pollRowsError } = await supabase
        .from("community_polls")
        .select("*")
        .eq("is_active", true)
        .lte("prompt_date", new Date().toISOString().slice(0, 10))
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("prompt_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pollRowsError) throw pollRowsError;

      if (pollRows) {
        const pollRow = pollRows as CommunityPollRow;
        const rawOptions = pollRow.options as Array<{ id: number; text: string }>;
        const { data: pollResults, error: pollResultsError } = await supabase.rpc("community_poll_results", { p_poll_id: pollRow.id });
        if (pollResultsError) throw pollResultsError;
        const results = pollResults as unknown as CommunityPollResults | null;
        if (!results || !results.counts || !Number.isFinite(results.total_votes)) throw new Error("Resultado da enquete indisponível.");

        const options = rawOptions.map((opt) => ({
          ...opt,
          votes: results.counts[String(opt.id)] || 0,
        }));

        if (!isMountedRef.current || requestVersion !== feedVersionRef.current) return;
        setPoll({
          id: pollRow.id,
          question: pollRow.question,
          options,
          total_votes: results.total_votes,
        user_voted_option: userId ? results.user_voted_option ?? null : null,
          created_at: pollRow.created_at,
          ends_at: pollRow.expires_at,
        });
      } else setPoll(null);
    } catch (err) {
      if (isMountedRef.current && requestVersion === feedVersionRef.current) setLoadError(getCommunityErrorMessage(err));
    } finally {
      if (requestVersion === feedVersionRef.current) {
        feedPendingRef.current = false;
        if (isMountedRef.current) {
          setIsLoadingMore(false);
          setIsLoaded(true);
        }
      } else if (isMountedRef.current && requestVersion === feedVersionRef.current) setPoll(null);
    }
  }, [userId, supabase, search, platform, article, topic, post, order]);

  useEffect(() => {
    if (!load) return;
    const t = setTimeout(() => {
      void fetchData(true);
    }, 0);
    return () => clearTimeout(t);
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
            payload.table === "community_comments" ||
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
    async (content: string, platformTag?: string, attachedArticle?: AttachedArticle, mediaUrl?: string, mediaAlt?: string) => {
      if (!user) throw new Error("Entre na sua conta para publicar no Brickboard.");
      if (mediaUrl && !mediaAlt?.trim()) throw new Error("Descreva a imagem antes de publicar.");

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

      setOperationError(null);
      let finalMediaUrl = mediaUrl || null;
      let uploadedMedia: { publicUrl: string; path: string } | null = null;
      if (mediaUrl?.startsWith("data:")) {
        if (!mediaUrl.startsWith("data:image/")) throw new Error("O anexo precisa ser uma imagem.");
        const imageBlob = await (await fetch(mediaUrl)).blob();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Entre na sua conta para enviar esta imagem.");
        const formData = new FormData();
        formData.set("image", imageBlob, "brick-image");
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const uploadResponse = await fetch(`${basePath}/api/community/media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        const uploadResult = await uploadResponse.json().catch(() => null) as { publicUrl?: string; path?: string; error?: string } | null;
        if (!uploadResponse.ok || !uploadResult?.publicUrl || !uploadResult.path) {
          throw new Error(uploadResult?.error || "N\u00e3o foi poss\u00edvel enviar a imagem.");
        }
        uploadedMedia = { publicUrl: uploadResult.publicUrl, path: uploadResult.path };
        finalMediaUrl = uploadedMedia.publicUrl;
      }
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name: authorName,
        author_username: profile?.username || null,
        author_avatar: authorAvatar,
        content,
        platform_tag: platformTag || null,
        attached_article: attachedArticle || null,
        media_url: finalMediaUrl,
        media_alt: finalMediaUrl ? mediaAlt?.trim() || null : null,
        topic_id: attachedArticle?.topic_id || null,
      });
      if (error) {
        if (uploadedMedia) {
          const { data: savedPost, error: confirmationError } = await supabase
            .from("community_posts")
            .select("id")
            .eq("user_id", user.id)
            .eq("media_url", uploadedMedia.publicUrl)
            .maybeSingle();
          if (!savedPost && !confirmationError) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
              await fetch(`${basePath}/api/community/media`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ path: uploadedMedia.path }),
              }).catch(() => undefined);
            }
          }
        }
        const message = getCommunityErrorMessage(error);
        setOperationError(message);
        throw new Error(message);
      }
      setOperationError(null);
    },
    [user, profile, supabase]
  );

  const toggleReaction = useCallback(
    async (postId: string, reactionType: ReactionType) => {
      if (!user) return false;
      const previousPost = posts.find((post) => post.id === postId);
      if (!previousPost) return false;

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
        const { data: existing, error: lookupError } = await supabase
          .from("community_reactions")
          .select("*")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (lookupError) throw lookupError;

        const existingRow = existing as CommunityReactionRow | null;

        if (existingRow) {
          if (existingRow.reaction_type === reactionType) {
            const { error } = await supabase.from("community_reactions").delete().eq("id", existingRow.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("community_reactions")
              .update({ reaction_type: reactionType })
              .eq("id", existingRow.id);
            if (error) throw error;
            await sendCommunityPush("reaction", postId);
          }
        } else {
          const { error } = await supabase.from("community_reactions").insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
          if (error) throw error;
          await sendCommunityPush("reaction", postId);
        }
        setOperationError(null);
        return true;
      } catch (cause) {
        setOperationError(getCommunityErrorMessage(cause));
        setPosts((prevPosts) => prevPosts.map((post) => post.id === postId ? previousPost : post));
        await fetchData();
        return false;
      }
    },
    [user, posts, supabase, fetchData, sendCommunityPush]
  );

  const votePoll = useCallback(
    async (optionId: number) => {
      if (!user || !poll || pollVotePendingRef.current) return;

      const previousVote = poll.user_voted_option;
      if (previousVote === optionId) return;

      pollVotePendingRef.current = true;
      setIsVoting(true);
      setPollVoteError(null);
      let voteSaved = false;

      try {
        const isChangingVote = previousVote !== undefined && previousVote !== null;
        if (isChangingVote) {
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          const response = await fetch(`${basePath}/api/community/poll-vote`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pollId: poll.id, optionId }),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => null) as { error?: string } | null;
            throw new Error(result?.error || "Não foi possível alterar o voto");
          }
        } else {
          const { error } = await supabase.from("community_poll_votes").insert({
              poll_id: poll.id,
              user_id: user.id,
              option_index: optionId,
            });
          if (error) throw error;
        }
        voteSaved = true;
        const { data: pollResults, error: pollResultsError } = await supabase.rpc("community_poll_results", { p_poll_id: poll.id });
        if (pollResultsError) throw pollResultsError;
        const results = pollResults as unknown as CommunityPollResults | null;
        if (!results || !results.counts || !Number.isFinite(results.total_votes)) throw new Error("Resultado da enquete indisponível.");
        setPoll((current) => current?.id === poll.id ? {
          ...current,
          options: current.options.map((option) => ({ ...option, votes: results.counts[String(option.id)] || 0 })),
          total_votes: results.total_votes,
          user_voted_option: results.user_voted_option,
        } : current);
      } catch (err) {
        if (voteSaved) {
          setPoll((current) => current?.id === poll.id ? { ...current, user_voted_option: optionId } : current);
          setPollVoteError("Seu voto foi registrado, mas os totais não foram atualizados. Recarregue a página.");
        } else setPollVoteError(getCommunityErrorMessage(err));
      } finally {
        pollVotePendingRef.current = false;
        setIsVoting(false);
      }
    },
    [user, poll, supabase]
  );

  const sharePost = useCallback(
    async (originalPost: CommunityPost, comment: string) => {
      if (!user) throw new Error("Entre na sua conta para compartilhar um Brick.");

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

      setOperationError(null);
      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name: authorName,
        author_username: profile?.username || null,
        author_avatar: authorAvatar,
        content: comment,
        attached_article: {
          _type: "shared_post",
          original_post_id: originalPost.id,
          original_author_name: originalPost.author_name,
          original_author_username: originalPost.author_username,
          original_author_avatar: originalPost.author_avatar,
          original_content: originalPost.content,
          original_created_at: originalPost.created_at,
          original_platform_tag: originalPost.platform_tag || undefined,
          original_attached_article: originalPost.attached_article || undefined,
        },
        topic_id: originalPost.topic_id || null,
      });
      if (error) {
        const message = getCommunityErrorMessage(error);
        setOperationError(message);
        throw new Error(message);
      }
      await sendCommunityPush("repost", originalPost.id);
    },
    [user, profile, supabase, sendCommunityPush]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) throw new Error("Entre na sua conta para apagar esta publicação.");
      const postToDelete = posts.find((post) => post.id === postId);

      setOperationError(null);

      let deletedPost: { id: string } | null = null;
      let deleteError: unknown = null;
      try {
        const result = await supabase
          .from("community_posts")
          .delete()
          .eq("id", postId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();
        const deletedRow = result.data as { id?: unknown } | null;
        deletedPost = typeof deletedRow?.id === "string" ? { id: deletedRow.id } : null;
        deleteError = result.error;
      } catch (err) {
        console.error("Failed to delete post:", err);
        const message = getCommunityErrorMessage(err);
        setOperationError(message);
        void fetchData();
        throw new Error(message);
      }

      if (deleteError) {
        console.error("Error deleting post:", deleteError);
        const message = getCommunityErrorMessage(deleteError);
        setOperationError(message);
        void fetchData();
        throw new Error(message);
      }
      if (!deletedPost) {
        const message = "Não foi possível apagar a publicação. Ela pode ter sido removida ou sua sessão não ter permissão.";
        setOperationError(message);
        void fetchData();
        throw new Error(message);
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      const mediaPath = ownCommunityMediaPath(postToDelete?.media_url || null, user.id);
      if (mediaPath) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setOperationError("O Brick foi removido, mas a imagem ainda precisa ser removida do armazenamento.");
            return;
          }
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
          const cleanupResponse = await fetch(`${basePath}/api/community/media`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ path: mediaPath }),
          });
          if (!cleanupResponse.ok) {
            setOperationError("O Brick foi removido, mas a imagem ainda precisa ser removida do armazenamento.");
          }
        } catch {
          setOperationError("O Brick foi removido, mas a imagem ainda precisa ser removida do armazenamento.");
        }
      }
    },
    [user, posts, supabase, fetchData]
  );

  const editPost = useCallback(
    async (postId: string, newContent: string) => {
      if (!user) throw new Error("Entre na sua conta para editar esta publicação.");
      const trimmed = newContent.trim();
      if (!trimmed || trimmed.length > 280) throw new Error("O texto precisa ter entre 1 e 280 caracteres.");

      setOperationError(null);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: trimmed } : p))
      );

      try {
        const { data: updatedPost, error } = await supabase
          .from("community_posts")
          .update({ content: trimmed })
          .eq("id", postId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();

        if (error) {
          throw error;
        }
        if (!updatedPost) {
          throw new Error("Não foi possível editar a publicação. Ela pode ter sido removida ou sua sessão não ter permissão.");
        }
      } catch (err) {
        console.error("Failed to edit post:", err);
        const message = err instanceof Error && err.message.startsWith("Não foi possível editar")
          ? err.message
          : getCommunityErrorMessage(err);
        setOperationError(message);
        void fetchData();
        throw new Error(message);
      }
    },
    [user, supabase, fetchData]
  );

  const addComment = useCallback(
    async (postId: string, content: string, parentId?: string) => {
      if (!user) throw new Error("Entre na sua conta para responder no Brickboard.");

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

      setOperationError(null);
      const { error } = await supabase.from("community_comments").insert({
        post_id: postId,
        parent_id: parentId || null,
        user_id: user.id,
        author_name: authorName,
        author_username: profile?.username || null,
        author_avatar: authorAvatar,
        content,
      });
      if (error) {
        const message = getCommunityErrorMessage(error);
        setOperationError(message);
        throw new Error(message);
      }
      setOperationError(null);
      await sendCommunityPush("comment", postId);
    },
    [user, profile, supabase, sendCommunityPush]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) throw new Error("Entre na sua conta para apagar uma resposta.");
      setOperationError(null);
      const { error } = await supabase.from("community_comments").delete().eq("id", commentId).eq("user_id", user.id);
      if (error) {
        const message = getCommunityErrorMessage(error);
        setOperationError(message);
        throw new Error(message);
      }
    },
    [user, supabase]
  );

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user) throw new Error("Entre na sua conta para curtir uma resposta.");

      try {
        setOperationError(null);
        const { data: existing, error: lookupError } = await supabase
          .from("community_comment_likes")
          .select("*")
          .eq("comment_id", commentId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (lookupError) throw lookupError;

        const existingRow = existing as { id: string } | null;

        if (existingRow) {
          const { error } = await supabase.from("community_comment_likes").delete().eq("id", existingRow.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("community_comment_likes").insert({
            comment_id: commentId,
            user_id: user.id,
          });
          if (error) throw error;
          await sendCommunityPush("comment_like", commentId);
        }
      } catch (cause) {
        const message = getCommunityErrorMessage(cause);
        setOperationError(message);
        throw new Error(message);
      }
    },
    [user, supabase, sendCommunityPush]
  );

  const getComments = useCallback(
    async (postId: string): Promise<CommunityComment[]> => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(getCommunityErrorMessage(error));

      const rows = data as CommunityCommentRow[] | null;
      if (!rows || rows.length === 0) return [];

      const commentIds = rows.map((c) => c.id);
      const likesMap: Record<string, number> = {};
      const userLikesMap: Record<string, boolean> = {};

      try {
        const likesData = await getCommunityCommentLikeSummaries(supabase, commentIds);

        for (const like of likesData) {
          likesMap[like.comment_id] = like.likes_count;
          if (like.user_has_liked) {
            userLikesMap[like.comment_id] = true;
          }
        }
      } catch {
      }

      return rows.map((row) => ({
        id: row.id,
        post_id: row.post_id,
        parent_id: row.parent_id,
        user_id: row.user_id,
        author_name: row.author_name,
        author_username: row.author_username,
        author_avatar: row.author_avatar || "/icons/default-avatar.png",
        is_official: row.is_official,
        content: row.content,
        created_at: row.created_at,
        likes_count: likesMap[row.id] || 0,
        user_has_liked: userLikesMap[row.id] || false,
      }));
    },
    [supabase]
  );

  return {
    posts,
    poll,
    isVoting,
    pollVoteError,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore: () => fetchData(false, true),
    loadError,
    fetchData,
    operationError,
    clearOperationError: () => setOperationError(null),
    addPost,
    deletePost,
    editPost,
    sharePost,
    toggleReaction,
    votePoll,
    addComment,
    deleteComment,
    toggleCommentLike,
    getComments,
  };
}
