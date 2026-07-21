"use client";

import { useEffect, useMemo, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";
import { useDeviceId } from "./useDeviceId";
import type { PostStats } from "@/lib/types/database";

interface StatsResponse {
  stats: Record<string, PostStats>;
}

export function usePostStats(postIds: string[]) {
  const deviceId = useDeviceId();
  const [stats, setStats] = useState<Record<string, PostStats>>({});
  const key = useMemo(() => postIds.join(","), [postIds]);

  useEffect(() => {
    if (!key) return;
    let active = true;
    const ids = key.split(",");
    const chunks = Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) => ids.slice(index * 50, index * 50 + 50));
    Promise.all(chunks.map((postIds) => invokeFunction<StatsResponse>("post-stats", {
      post_ids: postIds,
      device_id: deviceId || undefined,
    }))).then((results) => {
      if (active) setStats(Object.assign({}, ...results.map((result) => result.stats)));
    }).catch(() => {
      if (active) setStats({});
    });
    return () => {
      active = false;
    };
  }, [deviceId, key]);

  return stats;
}
