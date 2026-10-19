"use client";

import { useEffect, useState } from "react";

export type AppIconPreference = "default" | "inverted";

export const APP_ICON_KEY = "ob_app_icon";
export const APP_ICON_CHANGE_EVENT = "ob_app_icon_change";

export function getAppIconPreference(): AppIconPreference {
  if (typeof window === "undefined") return "default";
  try {
    const val = localStorage.getItem(APP_ICON_KEY);
    return val === "inverted" ? "inverted" : "default";
  } catch {
    return "default";
  }
}

export function applyAppIcon(pref: AppIconPreference) {
  if (typeof document === "undefined") return;

  const isInverted = pref === "inverted";

  try {
    const manifestEl = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestEl) {
      manifestEl.href = isInverted ? "/manifest-inverted.json" : "/manifest.webmanifest";
    }

    const appleIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    appleIcons.forEach((el) => {
      el.href = isInverted ? "/icons/apple-touch-icon-inverted.png" : "/icons/apple-touch-icon.png";
    });

    const favicons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    favicons.forEach((el) => {
      const sizes = el.getAttribute("sizes");
      if (sizes === "192x192") {
        el.href = isInverted ? "/icons/icon-inverted-192.png" : "/icons/icon-192.png";
      } else if (sizes === "512x512") {
        el.href = isInverted ? "/icons/icon-inverted-512.png" : "/icons/icon-512.png";
      }
    });

    const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = isInverted ? "#FFFFFF" : "#FF5E00";
    }
  } catch {
  }
}

export function setAppIconPreference(pref: AppIconPreference) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(APP_ICON_KEY, pref);
    document.cookie = `${APP_ICON_KEY}=${pref};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
  }

  applyAppIcon(pref);
  window.dispatchEvent(new CustomEvent(APP_ICON_CHANGE_EVENT, { detail: pref }));
}

export function useAppIcon() {
  const [appIcon, setAppIcon] = useState<AppIconPreference>("default");

  useEffect(() => {
    const initial = getAppIconPreference();
    setAppIcon(initial);
    applyAppIcon(initial);

    const handleCustomChange = (e: Event) => {
      const detail = (e as CustomEvent<AppIconPreference>).detail;
      if (detail) setAppIcon(detail);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === APP_ICON_KEY) {
        const next = e.newValue === "inverted" ? "inverted" : "default";
        setAppIcon(next);
        applyAppIcon(next);
      }
    };

    window.addEventListener(APP_ICON_CHANGE_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(APP_ICON_CHANGE_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const updateAppIcon = (next: AppIconPreference) => {
    setAppIcon(next);
    setAppIconPreference(next);
  };

  return { appIcon, setAppIcon: updateAppIcon };
}
