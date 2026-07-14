"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Comment as DBComment } from "@/lib/types/database";

interface UseCommentsReturn {
  comments: DBComment[];
  isLoading: boolean;
  error: string | null;
  addComment: (content: string, parentId?: string) => Promise<void>;
  fetchComments: () => Promise<void>;
}

export function useComments(postId: string): UseCommentsReturn {
  const supabase = useMemo(() => createClient(), []);
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
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as Error).message
          : "Erro ao carregar comentários";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Você precisa estar logado para comentar");
        return;
      }

      try {
        const { error: insertError } = await supabase
          .from("comments")
          .insert({
            post_id: postId,
            user_id: user.id,
            parent_id: parentId || null,
            content,
          } as any);

        if (insertError) throw insertError;
        await fetchComments();
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? (err as Error).message
            : "Erro ao enviar comentário";
        setError(msg);
      }
    },
    [postId, fetchComments]
  );

  return { comments, isLoading, error, addComment, fetchComments };
}
