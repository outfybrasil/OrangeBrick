"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGE_EVENT, getConsent, type ConsentLevel } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const [consent, setConsent] = useState<ConsentLevel | null>(null);
  const gaId = process.env.NEXT_PUBLIC_GA4_ID;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  useEffect(() => {
    const updateConsent = () => setConsent(getConsent());
    updateConsent();
    window.addEventListener(CONSENT_CHANGE_EVENT, updateConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, updateConsent);
  }, []);

  useEffect(() => {
    if (consent !== "accepted" || (!gaId && !plausibleDomain)) return;
    const injected: HTMLScriptElement[] = [];
    const analyticsWindow = window as unknown as Window & Record<string, unknown>;

    if (gaId) {
      analyticsWindow[`ga-disable-${gaId}`] = false;
      window.dataLayer = window.dataLayer || [];
      window.gtag = (...args: unknown[]) => {
        window.dataLayer?.push(args);
      };
      const loader = document.createElement("script");
      loader.async = true;
      loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(loader);
      injected.push(loader);
      window.gtag("js", new Date());
      window.gtag("config", gaId);
      window.gtag("consent", "update", { analytics_storage: "granted" });
    }

    if (plausibleDomain) {
      const plausible = document.createElement("script");
      plausible.defer = true;
      plausible.dataset.domain = plausibleDomain;
      plausible.src = "https://plausible.io/js/script.js";
      document.head.appendChild(plausible);
      injected.push(plausible);
    }

    return () => {
      for (const script of injected) script.remove();
      if (gaId) {
        analyticsWindow[`ga-disable-${gaId}`] = true;
        window.gtag?.("consent", "update", { analytics_storage: "denied" });
      }
      if (plausibleDomain) window.plausible = () => undefined;
    };
  }, [consent, gaId, plausibleDomain]);

  return null;
}
