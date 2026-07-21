"use client";

import { useCallback, useMemo, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { Comment as DBComment } from "@/lib/types/database";

export function useComments(postId: string) {
  const supabase = useMemo(() => createDataClient(), []);
  const [comments, setComments] = useState<DBComment[]>([]);
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
      setComments((data as DBComment[]) || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar comentários");
    } finally {
      setIsLoading(false);
    }
  }, [postId, supabase]);

  const addComment = useCallback(async (content: string) => {
    setError(null);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) throw authError;
        user = data.user;
      }
      if (!user) throw new Error("Não foi possível criar uma sessão para comentar");
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: user.id, parent_id: null, content })
        .select()
        .single();
      if (insertError) throw insertError;
      setComments((previous) => [data as DBComment, ...previous]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erro ao enviar comentário";
      setError(message);
      throw new Error(message);
    }
  }, [postId, supabase]);

  return { comments, isLoading, error, addComment, fetchComments };
}
