"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";
import { useDeviceId } from "./useDeviceId";
import type { ReactionType } from "@/lib/types/database";

interface UseReactionsOptions {
  postId: string;
  initial: Record<ReactionType, number>;
  initialUserReaction?: ReactionType | null;
  hydrate?: boolean;
}

interface ToggleReactionResponse {
  activeReaction: ReactionType | null;
  counts: Record<ReactionType, number>;
}

export function useReactions({ postId, initial, initialUserReaction = null, hydrate = false }: UseReactionsOptions) {
  const deviceId = useDeviceId();
  const pendingRef = useRef(false);
  const [counts, setCounts] = useState(initial);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(initialUserReaction);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrate || !deviceId || !postId) return;
    let active = true;
    invokeFunction<{ stats: Record<string, { reactions: Record<ReactionType, number>; userReaction: ReactionType | null }> }>("post-stats", {
      post_ids: [postId],
      device_id: deviceId,
    }).then((result) => {
      const current = result.stats[postId];
      if (active && current) {
        setCounts(current.reactions);
        setUserReaction(current.userReaction);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [deviceId, hydrate, postId]);

  const toggleReaction = useCallback(async (type: ReactionType) => {
    if (!deviceId || !postId || pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);
    setError(null);
    try {
      const result = await invokeFunction<ToggleReactionResponse>("toggle-reaction", {
        post_id: postId,
        device_id: deviceId,
        reaction_type: type,
      });
      setCounts(result.counts);
      setUserReaction(result.activeReaction);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao registrar reação");
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, [deviceId, postId]);

  return { counts, isPending, error, toggleReaction, userReaction };
}
