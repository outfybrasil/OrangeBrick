"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";

export type FollowType = "topic" | "platform" | "profile";

export function useFollowPreferences() {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [follows, setFollows] = useState<Record<FollowType, string[]>>({ topic: [], platform: [], profile: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    supabase.from("user_follows").select("follow_type, follow_value").eq("user_id", user.id).then(({ data }) => {
      const next: Record<FollowType, string[]> = { topic: [], platform: [], profile: [] };
      for (const row of data || []) next[row.follow_type as FollowType].push(row.follow_value as string);
      setFollows(next);
      setIsLoading(false);
    });
  }, [supabase, user]);

  const toggleFollow = useCallback(async (type: FollowType, value: string) => {
    if (!user) return false;
    const active = follows[type].includes(value);
    setFollows((current) => ({ ...current, [type]: active ? current[type].filter((item) => item !== value) : [...current[type], value] }));
    if (active) await supabase.from("user_follows").delete().eq("user_id", user.id).eq("follow_type", type).eq("follow_value", value);
    else await supabase.from("user_follows").insert({ user_id: user.id, follow_type: type, follow_value: value });
    return !active;
  }, [follows, supabase, user]);

  return { follows, isLoading, isAuthenticated: Boolean(user), toggleFollow };
}
