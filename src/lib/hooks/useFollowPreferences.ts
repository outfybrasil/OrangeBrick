"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";

export type FollowType = "topic" | "platform" | "profile";

export function useFollowPreferences() {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [follows, setFollows] = useState<Record<FollowType, string[]>>({ topic: [], platform: [], profile: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setFollows({ topic: [], platform: [], profile: [] });
        setError(null);
        setIsLoading(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setIsLoading(true); });
    supabase.from("user_follows").select("follow_type, follow_value").eq("user_id", user.id).then(({ data, error: loadError }) => {
      if (cancelled) return;
      setError(loadError ? "Não foi possível carregar os assuntos acompanhados." : null);
      const next: Record<FollowType, string[]> = { topic: [], platform: [], profile: [] };
      for (const row of data || []) next[row.follow_type as FollowType].push(row.follow_value as string);
      setFollows(next);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [supabase, user]);

  const toggleFollow = useCallback(async (type: FollowType, value: string) => {
    if (!user || pendingRef.current || isLoading) return false;
    pendingRef.current = true;
    const active = follows[type].includes(value);
    setIsSaving(true);
    setError(null);
    try {
      const result = active
        ? await supabase.from("user_follows").delete().eq("user_id", user.id).eq("follow_type", type).eq("follow_value", value)
        : await supabase.from("user_follows").insert({ user_id: user.id, follow_type: type, follow_value: value });
      if (result.error) throw result.error;
      setFollows((current) => ({ ...current, [type]: active ? current[type].filter((item) => item !== value) : [...current[type], value] }));
      return !active;
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
      return active;
    } finally {
      pendingRef.current = false;
      setIsSaving(false);
    }
  }, [follows, isLoading, supabase, user]);

  return { follows, isLoading, isSaving, error, isAuthenticated: Boolean(user), toggleFollow };
}
