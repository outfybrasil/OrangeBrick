"use client";

import { useSyncExternalStore } from "react";
import {
  CONSENT_CHANGE_EVENT,
  DEVICE_STORAGE_KEY,
  getConsent,
} from "@/lib/consent";

function subscribe(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): string {
  if (getConsent() !== "accepted") return "";
  return window.localStorage.getItem(DEVICE_STORAGE_KEY) ?? "";
}

export function useDeviceId(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => "");
}
