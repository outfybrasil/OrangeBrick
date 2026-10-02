"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post, PostCategory } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";
import { normalizeNewsSearch } from "@/lib/news-query";

const PAGE_SIZE = 50;
const REFRESH_INTERVAL = 120_000;
const EMPTY_INITIAL_POSTS: Post[] = [];
const EMPTY_PLATFORM_KEYWORDS: string[] = [];

interface UseInfiniteFeedReturn {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

export function useInfiniteFeed(
  category?: PostCategory | null,
  initialPosts: Post[] = EMPTY_INITIAL_POSTS,
  search = "",
  tag = "",
  platformKeywords: string[] = EMPTY_PLATFORM_KEYWORDS
): UseInfiniteFeedReturn {
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

  const platformKeywordsKey = platformKeywords.join(",");
  const stablePlatformKeywords = useMemo(
    () => (platformKeywordsKey ? platformKeywordsKey.split(",") : EMPTY_PLATFORM_KEYWORDS),
    [platformKeywordsKey]
  );
  const filterKey = useMemo(
    () => `${category || ""}|${search.trim()}|${tag.trim()}|${platformKeywordsKey}`,
    [category, search, tag, platformKeywordsKey]
  );
  const prevFilterKeyRef = useRef(filterKey);
  const isFirstMountRef = useRef(true);

  const fetchPosts = useCallback(
    async (isRefresh = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        if (isRefresh) {
          cursorRef.current = null;
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
        const searchTerm = normalizeNewsSearch(search);
        if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
        const tagTerm = normalizeNewsSearch(tag);
        if (tagTerm) query = query.or(`title.ilike.%${tagTerm}%,summary.ilike.%${tagTerm}%,author_tag.ilike.%${tagTerm}%`);
        if (stablePlatformKeywords.length > 0) {
          const platformFilters = stablePlatformKeywords.flatMap((keyword) => {
            const term = normalizeNewsSearch(keyword);
            if (!term) return [];
            return [`title.ilike.%${term}%`, `summary.ilike.%${term}%`, `category.ilike.%${term}%`, `author_tag.ilike.%${term}%`];
          });
          if (platformFilters.length > 0) query = query.or(platformFilters.join(","));
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

        setHasMore(newPosts.length === PAGE_SIZE);
        cursorRef.current = newPosts.at(-1)?.created_at || null;
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
    [category, search, tag, stablePlatformKeywords, supabase]
  );

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (initialPosts.length === 0) {
        const timer = setTimeout(() => {
          void fetchPosts(true);
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      const timer = setTimeout(() => {
        void fetchPosts(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [filterKey, fetchPosts, initialPosts.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loadingRef.current) {
        void fetchPosts(true);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void fetchPosts(false);
  }, [hasMore, isLoadingMore, isLoading, fetchPosts]);

  const refresh = useCallback(() => {
    void fetchPosts(true);
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
