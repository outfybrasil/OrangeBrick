"use client";

import { useState, useEffect, useCallback } from "react";
import type { Post } from "@/lib/types/database";

const BOOKMARKS_KEY = "ob_saved_bookmarks";
const EVENT_NAME = "ob_bookmarks_updated";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Post[]>([]);

  const loadBookmarks = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (raw) {
        setBookmarks(JSON.parse(raw));
      } else {
        setBookmarks([]);
      }
    } catch {
      setBookmarks([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadBookmarks);

    const handleCustomEvent = () => loadBookmarks();
    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, [loadBookmarks]);

  const toggleBookmark = useCallback((post: Post) => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      let list: Post[] = raw ? JSON.parse(raw) : [];

      const exists = list.some((item) => item.id === post.id);
      if (exists) {
        list = list.filter((item) => item.id !== post.id);
      } else {
        list = [post, ...list];
      }

      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
    }
  }, []);

  const isBookmarked = useCallback(
    (postId: string) => {
      return bookmarks.some((item) => item.id === postId);
    },
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
