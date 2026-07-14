"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export function useCommentCount(postId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      setCount(c ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`comments-count-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        fetchCount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  return count;
}
