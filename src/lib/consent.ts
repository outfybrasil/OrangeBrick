export const CONSENT_STORAGE_KEY = "ob-cookie-consent";
export const ADVERTISING_CONSENT_STORAGE_KEY = "ob-advertising-consent";
export const DEVICE_STORAGE_KEY = "orange_brick_device_id";
export const CONSENT_CHANGE_EVENT = "orange-brick-consent-change";

export type ConsentLevel = "accepted" | "denied";

export function getConsent(): ConsentLevel | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "denied" ? value : null;
}

export function getAdvertisingConsent(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ADVERTISING_CONSENT_STORAGE_KEY);
  return value === "accepted" ? true : value === "denied" ? false : null;
}

export function createDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function saveConsent(level: ConsentLevel, advertising: boolean | null): void {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, level);
  if (advertising === null) {
    window.localStorage.removeItem(ADVERTISING_CONSENT_STORAGE_KEY);
  } else {
    window.localStorage.setItem(ADVERTISING_CONSENT_STORAGE_KEY, advertising ? "accepted" : "denied");
  }

  if (level === "accepted" && !window.localStorage.getItem(DEVICE_STORAGE_KEY)) {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, createDeviceId());
  }

  if (level === "denied") {
    window.localStorage.removeItem(DEVICE_STORAGE_KEY);
  }

  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function clearConsent(): void {
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  window.localStorage.removeItem(ADVERTISING_CONSENT_STORAGE_KEY);
  window.localStorage.removeItem(DEVICE_STORAGE_KEY);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}
