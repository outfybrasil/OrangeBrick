"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommunityPost } from "@/lib/types/community";
import { useToast } from "@/lib/contexts/ToastContext";

const SAVED_BRICKS_KEY = "ob_saved_bricks";
const EVENT_NAME = "ob_saved_bricks_updated";

export function useSavedBricks() {
  const [savedBricks, setSavedBricks] = useState<CommunityPost[]>([]);
  const toast = useToast();

  const loadSavedBricks = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SAVED_BRICKS_KEY);
      if (raw) {
        setSavedBricks(JSON.parse(raw));
      } else {
        setSavedBricks([]);
      }
    } catch {
      setSavedBricks([]);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadSavedBricks);

    const handleCustomEvent = () => loadSavedBricks();
    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleCustomEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleCustomEvent);
    };
  }, [loadSavedBricks]);

  const toggleSaveBrick = useCallback(
    (brick: CommunityPost) => {
      try {
        const raw = localStorage.getItem(SAVED_BRICKS_KEY);
        let list: CommunityPost[] = raw ? JSON.parse(raw) : [];

        const exists = list.some((item) => item.id === brick.id);
        if (exists) {
          list = list.filter((item) => item.id !== brick.id);
          toast.info("Brick removido dos salvos");
        } else {
          list = [brick, ...list];
          toast.success("Brick salvo nos seus favoritos");
        }

        localStorage.setItem(SAVED_BRICKS_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event(EVENT_NAME));
      } catch {
        toast.error("Não foi possível atualizar os salvos");
      }
    },
    [toast]
  );

  const isBrickSaved = useCallback(
    (brickId: string) => {
      return savedBricks.some((item) => item.id === brickId);
    },
    [savedBricks]
  );

  return { savedBricks, toggleSaveBrick, isBrickSaved };
}
