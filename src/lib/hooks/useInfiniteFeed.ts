"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostCategory } from "@/lib/types/database";

const PAGE_SIZE = 10;

interface UseInfiniteFeedReturn {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

export function useInfiniteFeed(category?: PostCategory | null): UseInfiniteFeedReturn {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const fetchPosts = useCallback(
    async (isRefresh = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        if (isRefresh) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        let query = supabase
          .from("posts")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (category) {
          query = query.eq("category", category);
        }

        if (!isRefresh && cursorRef.current) {
          query = query.lt("published_at", cursorRef.current);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const newPosts = (data as Post[]) || [];

        if (isRefresh) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }

        if (newPosts.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          cursorRef.current = newPosts[newPosts.length - 1].published_at;
        }
      } catch (err) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? (err as Error).message
            : "Erro ao carregar posts";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [category, supabase]
  );

  useEffect(() => {
    queueMicrotask(() => {
      cursorRef.current = null;
      setHasMore(true);
      void fetchPosts(true);
    });
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    fetchPosts(false);
  }, [hasMore, isLoadingMore, isLoading, fetchPosts]);

  const refresh = useCallback(() => {
    cursorRef.current = null;
    setHasMore(true);
    fetchPosts(true);
  }, [fetchPosts]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
