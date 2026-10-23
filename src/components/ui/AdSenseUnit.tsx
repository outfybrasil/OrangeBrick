"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CONSENT_CHANGE_EVENT, getAdvertisingConsent } from "@/lib/consent";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";
const publisherValid = /^pub-\d{16}$/.test(publisherId);
const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true" && publisherValid;
let scriptLoad: Promise<void> | null = null;

function subscribeToAdvertisingConsent(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getAdvertisingConsentSnapshot() {
  return getAdvertisingConsent() === true;
}

function getAdvertisingConsentServerSnapshot() {
  return false;
}

function loadAdSenseScript() {
  if (window.adsbygoogle) return Promise.resolve();
  if (scriptLoad) return scriptLoad;

  scriptLoad = new Promise<void>((resolve, reject) => {
    const clientId = `ca-${publisherId}`;
    const script = document.createElement("script");
    script.id = "orange-brick-adsense";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.dataset.adClient = clientId;
    script.crossOrigin = "anonymous";

    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
    if (nonce) script.nonce = nonce;

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => {
      script.remove();
      scriptLoad = null;
      reject(new Error("AdSense could not be loaded"));
    }, { once: true });
    document.head.appendChild(script);
  });

  return scriptLoad;
}

export function AdSenseUnit({ slotId }: { slotId: string }) {
  const allowed = useSyncExternalStore(subscribeToAdvertisingConsent, getAdvertisingConsentSnapshot, getAdvertisingConsentServerSnapshot);
  const adRef = useRef<HTMLModElement>(null);
  const validSlot = /^\d+$/.test(slotId);

  useEffect(() => {
    if (!adsenseEnabled || !validSlot || !allowed || !adRef.current) return;
    let active = true;

    void loadAdSenseScript().then(() => {
      if (!active || !adRef.current) return;
      (window.adsbygoogle ??= []).push({});
    }).catch(() => undefined);

    return () => {
      active = false;
    };
  }, [allowed, slotId, validSlot]);

  if (!adsenseEnabled || !validSlot || !allowed) return null;

  return (
    <section aria-label="Publicidade" className="my-8 border-y border-white/10 py-4">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-[#999ba3]">Publicidade</p>
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: "block" }}
        data-ad-client={`ca-${publisherId}`}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
