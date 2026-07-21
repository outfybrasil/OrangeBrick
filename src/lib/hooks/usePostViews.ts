"use client";

import { useCallback, useRef, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";
import { useDeviceId } from "./useDeviceId";

interface UsePostViewsOptions {
  postId: string;
  initialCount?: number;
}

interface RegisterViewResponse {
  action: "registered" | "already_viewed";
  count: number;
}

export function usePostViews({ postId, initialCount = 0 }: UsePostViewsOptions) {
  const deviceId = useDeviceId();
  const registeredRef = useRef(false);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);

  const registerView = useCallback(async () => {
    if (!deviceId || !postId || registeredRef.current) return;
    registeredRef.current = true;
    try {
      const result = await invokeFunction<RegisterViewResponse>("register-view", {
        post_id: postId,
        device_id: deviceId,
      });
      setCount(result.count);
    } catch (cause) {
      registeredRef.current = false;
      setError(cause instanceof Error ? cause.message : "Erro ao registrar visualização");
    }
  }, [deviceId, postId]);

  return { count, error, registerView };
}
