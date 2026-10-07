"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { Comment as DBComment, Profile } from "@/lib/types/database";
import { useAuth } from "@/lib/contexts/AuthContext";

export interface CommentWithProfile extends DBComment {
  author_nickname: string;
  author_avatar: string | null;
  likes_count: number;
  user_has_liked: boolean;
}

export function useComments(postId: string) {
  const pageSize = 40;
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const pendingRef = useRef(false);

  const fetchComments = useCallback(async (append = false) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(append ? offsetRef.current : 0, (append ? offsetRef.current : 0) + pageSize - 1);
      if (fetchError) throw fetchError;
      const rootComments = (data as DBComment[]) || [];
      offsetRef.current = (append ? offsetRef.current : 0) + rootComments.length;
      setHasMore(rootComments.length === pageSize);
      let rawComments = rootComments;
      if (rootComments.length > 0) {
        const { data: replies, error: repliesError } = await supabase
          .from("comments")
          .select("*")
          .in("parent_id", rootComments.map((comment) => comment.id))
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });
        if (repliesError) throw repliesError;
        rawComments = [...rootComments, ...((replies || []) as DBComment[])];
      }

      const userIds = [...new Set(rawComments.map((c) => c.user_id))];
      const profileMap: Record<string, { nickname: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("user_id, nickname, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          for (const p of profiles as Pick<Profile, "user_id" | "nickname" | "avatar_url">[]) {
            profileMap[p.user_id] = { nickname: p.nickname, avatar_url: p.avatar_url };
          }
        }
      }

      const likesMap: Record<string, number> = {};
      const likedCommentIds = new Set<string>();
      if (rawComments.length > 0) {
        const commentIds = rawComments.map((comment) => comment.id);
        for (let index = 0; index < commentIds.length; index += 200) {
          const { data: summaries, error: summariesError } = await supabase.rpc("article_comment_like_summaries", {
            target_comment_ids: commentIds.slice(index, index + 200),
          });
          if (summariesError) throw summariesError;
          for (const summary of summaries || []) {
            likesMap[summary.comment_id] = Number(summary.likes_count);
            if (summary.user_has_liked) likedCommentIds.add(summary.comment_id);
          }
        }
      }

      const enriched: CommentWithProfile[] = rawComments.map((c) => ({
        ...c,
        author_nickname: profileMap[c.user_id]?.nickname || c.user_id.substring(0, 8),
        author_avatar: profileMap[c.user_id]?.avatar_url || null,
        likes_count: likesMap[c.id] || 0,
        user_has_liked: likedCommentIds.has(c.id),
      }));
      setComments((current) => append ? [...current, ...enriched.filter((comment) => !current.some((item) => item.id === comment.id))] : enriched);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar comentários");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      pendingRef.current = false;
    }
  }, [pageSize, postId, supabase]);

  const addComment = useCallback(async (content: string, parentId: string | null = null) => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado para comentar.");
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: user.id, parent_id: parentId, content })
        .select()
        .single();
      if (insertError) throw insertError;
      const inserted = data as DBComment;

      let author_nickname = user.id.substring(0, 8);
      let author_avatar: string | null = null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname, avatar_url")
        .eq("user_id", user.id)
        .single<Pick<Profile, "nickname" | "avatar_url">>();
      if (profile) {
        author_nickname = profile.nickname;
        author_avatar = profile.avatar_url;
      }

      setComments((previous) => [{
        ...inserted,
        author_nickname,
        author_avatar,
        likes_count: 0,
        user_has_liked: false,
      }, ...previous]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao enviar comentário";
      setError(message);
      throw new Error(message);
    }
  }, [postId, supabase]);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    if (!user) throw new Error("Entre na sua conta para curtir um comentário.");
    const current = comments.find((comment) => comment.id === commentId);
    if (!current) return;

    const nextHasLiked = !current.user_has_liked;
    setComments((previous) => previous.map((comment) => comment.id === commentId
      ? {
          ...comment,
          user_has_liked: nextHasLiked,
          likes_count: Math.max(0, comment.likes_count + (nextHasLiked ? 1 : -1)),
        }
      : comment));

    try {
      const { error: likeError } = await supabase.rpc("set_article_comment_like", {
        target_comment_id: commentId,
        should_like: nextHasLiked,
      });
      if (likeError) throw likeError;
    } catch {
      setComments((previous) => previous.map((comment) => comment.id === commentId ? current : comment));
      throw new Error("Não foi possível atualizar a curtida. Tente novamente.");
    }
  }, [comments, supabase, user]);

  const deleteComment = useCallback(
    async (commentId: string) => {
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Você precisa estar logado.");
      const { error: deleteError } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);
      if (deleteError) throw deleteError;
      setComments((previous) => previous.filter((comment) => comment.id !== commentId && comment.parent_id !== commentId));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Erro ao apagar comentário";
        setError(message);
      }
    },
    [supabase]
  );

  return { comments, isLoading, isLoadingMore, hasMore, error, addComment, deleteComment, toggleCommentLike, fetchComments, loadMore: () => fetchComments(true) };
}
