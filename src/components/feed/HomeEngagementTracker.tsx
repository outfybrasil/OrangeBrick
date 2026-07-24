"use client";

import { useEffect, useMemo } from "react";
import { getConsent } from "@/lib/consent";
import { createDataClient } from "@/lib/supabase/client";

export function HomeEngagementTracker() {
  const supabase = useMemo(() => createDataClient(), []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (getConsent() !== "accepted") return;
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-home-event]");
      if (!element) return;
      const eventName = element.dataset.homeEvent;
      if (!eventName) return;
      void supabase.from("home_engagement_events").insert({
        event_name: eventName,
        target: element.dataset.homeTarget?.slice(0, 180) || null,
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [supabase]);

  return null;
}
