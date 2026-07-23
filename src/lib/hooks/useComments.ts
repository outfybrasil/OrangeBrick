"use client";

import { useCallback, useMemo, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { Comment as DBComment, Profile } from "@/lib/types/database";

export interface CommentWithProfile extends DBComment {
  author_nickname: string;
  author_avatar: string | null;
}

export function useComments(postId: string) {
  const supabase = useMemo(() => createDataClient(), []);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      const rawComments = (data as DBComment[]) || [];

      const userIds = [...new Set(rawComments.map((c) => c.user_id))];
      const profileMap: Record<string, { nickname: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nickname, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          for (const p of profiles as Pick<Profile, "user_id" | "nickname" | "avatar_url">[]) {
            profileMap[p.user_id] = { nickname: p.nickname, avatar_url: p.avatar_url };
          }
        }
      }

      const enriched: CommentWithProfile[] = rawComments.map((c) => ({
        ...c,
        author_nickname: profileMap[c.user_id]?.nickname || c.user_id.substring(0, 8),
        author_avatar: profileMap[c.user_id]?.avatar_url || null,
      }));
      setComments(enriched);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar comentários");
    } finally {
      setIsLoading(false);
    }
  }, [postId, supabase]);

  const addComment = useCallback(async (content: string) => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Você precisa estar logado para comentar.");
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: user.id, parent_id: null, content })
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

      setComments((previous) => [{ ...inserted, author_nickname, author_avatar }, ...previous]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao enviar comentário";
      setError(message);
      throw new Error(message);
    }
  }, [postId, supabase]);

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
        setComments((previous) => previous.filter((c) => c.id !== commentId));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Erro ao apagar comentário";
        setError(message);
      }
    },
    [supabase]
  );

  return { comments, isLoading, error, addComment, deleteComment, fetchComments };
}
