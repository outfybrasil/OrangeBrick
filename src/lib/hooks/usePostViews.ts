"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDeviceId } from "./useDeviceId";

interface UsePostViewsOptions {
  postId: string;
}

interface PostViewsState {
  count: number;
  isPending: boolean;
  error: string | null;
}

export function usePostViews({ postId }: UsePostViewsOptions) {
  const deviceId = useDeviceId();
  const supabase = useMemo(() => createClient(), []);
  const isSubscribedRef = useRef(false);
  const [state, setState] = useState<PostViewsState>({
    count: 0,
    isPending: false,
    error: null,
  });

  useEffect(() => {
    if (!postId) return;

    async function fetchCount() {
      const { count, error } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      if (!error && count !== null) {
        setState((prev) => ({ ...prev, count }));
      }
    }

    fetchCount();
  }, [postId, supabase]);

  useEffect(() => {
    if (!deviceId || !postId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel(`post-views-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_views",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          setState((prev) => ({ ...prev, count: prev.count + 1 }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      isSubscribedRef.current = false;
    };
  }, [deviceId, postId, supabase]);

  const registerView = async () => {
    if (!deviceId || !postId) return;

    setState((prev) => ({ ...prev, isPending: true, error: null }));

    try {
      const res = await fetch("/api/views/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          device_id: deviceId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao registrar visualização");
      }

      const data = await res.json();

      if (data.action === "registered") {
        setState((prev) => ({ ...prev, count: prev.count + 1 }));
      }
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as Error).message
          : "Erro ao registrar visualização";
      setState((prev) => ({ ...prev, error: msg }));
    } finally {
      setState((prev) => ({ ...prev, isPending: false }));
    }
  };

  return {
    count: state.count,
    isPending: state.isPending,
    error: state.error,
    registerView,
  };
}
