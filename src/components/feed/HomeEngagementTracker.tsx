"use client";

import { useEffect } from "react";
import { getConsent } from "@/lib/consent";

export function HomeEngagementTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (getConsent() !== "accepted") return;
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-home-event]");
      if (!element) return;
      const eventName = element.dataset.homeEvent;
      if (!eventName) return;
      void fetch("/api/home-engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName,
          target: element.dataset.homeTarget?.slice(0, 180) || null,
        }),
        keepalive: true,
      });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
