"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { audiencePath } from "@/lib/audience";
import { CONSENT_CHANGE_EVENT, DEVICE_STORAGE_KEY, getConsent } from "@/lib/consent";

export function AudienceTracker() {
  const pathname = usePathname();
  const lastVisit = useRef<{ path: string; id: string } | null>(null);
  useEffect(() => {
    const path = audiencePath(pathname);
    if (!path) { lastVisit.current = null; return; }
    if (lastVisit.current?.path !== path) lastVisit.current = { path, id: crypto.randomUUID() };
    const visit = lastVisit.current;
    let sent = false;
    const record = () => {
      try {
        if (sent || getConsent() !== "accepted") return;
        const device = localStorage.getItem(DEVICE_STORAGE_KEY);
        if (!device) return;
        sent = true;
        void fetch("/api/audience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, id: visit.id, device }), keepalive: true }).catch(() => undefined);
      } catch {}
    };
    record();
    window.addEventListener(CONSENT_CHANGE_EVENT, record);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, record);
  }, [pathname]);
  return null;
}
