"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA4_ID;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  useEffect(() => {
    if (!gaId && !plausibleDomain) return;
    const injected: HTMLScriptElement[] = [];

    if (gaId) {
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
    };
  }, [gaId, plausibleDomain]);

  return null;
}
