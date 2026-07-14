"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReactionType } from "@/lib/types/database";

interface GlobalReactionCounts {
  hype: number;
  flop: number;
  salty: number;
  defendo: number;
  brick: number;
}

export function useGlobalReactions() {
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState<GlobalReactionCounts>({
    hype: 0,
    flop: 0,
    salty: 0,
    defendo: 0,
    brick: 0,
  });
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const fetchInitial = async () => {
      const { data } = await supabase
        .from("reactions")
        .select("reaction_type");

      if (data) {
        const rows = data as { reaction_type: string }[];
        const acc: GlobalReactionCounts = { hype: 0, flop: 0, salty: 0, defendo: 0, brick: 0 };
        for (const row of rows) {
          const t = row.reaction_type as ReactionType;
          if (t in acc) acc[t as keyof GlobalReactionCounts]++;
        }
        setCounts(acc);
      }
    };

    fetchInitial();

    const channel = supabase
      .channel("global-reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        (payload) => {
          setCounts((prev) => {
            const next = { ...prev };
            if (payload.eventType === "INSERT") {
              const t = (payload.new as { reaction_type: string }).reaction_type as keyof GlobalReactionCounts;
              if (t in next) next[t]++;
            } else if (payload.eventType === "DELETE") {
              const t = (payload.old as { reaction_type: string }).reaction_type as keyof GlobalReactionCounts;
              if (t in next && next[t] > 0) next[t]--;
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      subscribedRef.current = false;
    };
  }, [supabase]);

  const total = counts.hype + counts.flop + counts.salty + counts.defendo + counts.brick;

  return { counts, total };
}
