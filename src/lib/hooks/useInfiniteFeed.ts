"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostCategory } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 120_000;

interface UseInfiniteFeedReturn {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

export function useInfiniteFeed(category?: PostCategory | null, initialPosts: Post[] = []): UseInfiniteFeedReturn {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(initialPosts.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(
    initialPosts.length === PAGE_SIZE ? initialPosts[initialPosts.length - 1].created_at : null
  );
  const loadingRef = useRef(false);
  const hydratedRef = useRef(false);

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
          .select(POST_LIST_COLUMNS)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);

        if (category) {
          query = query.eq("category", category);
        }

        if (!isRefresh && cursorRef.current) {
          query = query.lt("created_at", cursorRef.current);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const newPosts = ((data as Post[]) || []).filter(
          (p) => p.is_published
        );

        if (isRefresh) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }

        if (newPosts.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          cursorRef.current = newPosts[newPosts.length - 1].created_at;
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
    const firstRun = !hydratedRef.current;
    hydratedRef.current = true;

    if (firstRun && initialPosts.length > 0) {
      const interval = setInterval(() => {
        if (!loadingRef.current) {
          cursorRef.current = null;
          setHasMore(true);
          fetchPosts(true);
        }
      }, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }

    queueMicrotask(() => {
      cursorRef.current = null;
      setHasMore(true);
      void fetchPosts(true);
    });

    const interval = setInterval(() => {
      if (!loadingRef.current) {
        cursorRef.current = null;
        setHasMore(true);
        fetchPosts(true);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchPosts, initialPosts]);

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
