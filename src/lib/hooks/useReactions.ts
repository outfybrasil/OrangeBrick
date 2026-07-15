"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDeviceId } from "./useDeviceId";
import type { ReactionType } from "@/lib/types/database";

interface UseReactionsOptions {
  postId: string;
  initial: Record<ReactionType, number>;
}

interface ReactionState {
  counts: Record<ReactionType, number>;
  isPending: boolean;
  error: string | null;
}

export function useReactions({ postId, initial }: UseReactionsOptions) {
  const deviceId = useDeviceId();
  const supabase = useMemo(() => createClient(), []);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);
  const [state, setState] = useState<ReactionState>({
    counts: initial,
    isPending: false,
    error: null,
  });

  useEffect(() => {
    if (!deviceId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel(`reactions-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as { reaction_type: string } | null;
          const oldRow = payload.old as { reaction_type: string } | null;

          setState((prev) => {
            const counts = { ...prev.counts };

            if (eventType === "INSERT" && newRow) {
              const t = newRow.reaction_type as ReactionType;
              counts[t] = (counts[t] || 0) + 1;
            } else if (eventType === "DELETE" && oldRow) {
              const t = oldRow.reaction_type as ReactionType;
              counts[t] = Math.max(0, (counts[t] || 0) - 1);
            }

            return { ...prev, counts };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      isSubscribedRef.current = false;
    };
  }, [deviceId, postId, supabase]);

  const toggleReaction = useCallback(
    async (type: ReactionType) => {
      if (!deviceId) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);

      setState((prev) => ({
        ...prev,
        isPending: true,
        error: null,
      }));

      debounceRef.current = setTimeout(async () => {
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
          const functionUrl = `${supabaseUrl}/functions/v1/toggle-reaction`;

          const res = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${anonKey}`,
            },
            body: JSON.stringify({
              post_id: postId,
              device_id: deviceId,
              reaction_type: type,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Erro ao registrar reação");
          }
        } catch (err) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? (err as Error).message
              : "Erro ao registrar reação";
          setState((prev) => ({
            ...prev,
            isPending: false,
            error: msg,
          }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, error: null }));
          }, 3000);
        } finally {
          setState((prev) => ({ ...prev, isPending: false }));
        }
      }, 300);
    },
    [deviceId, postId]
  );

  return {
    counts: state.counts,
    isPending: state.isPending,
    error: state.error,
    toggleReaction,
  };
}
