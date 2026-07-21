"use client";

import { useState } from "react";

function generateId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const STORAGE_KEY = "orange_brick_device_id";

export function useDeviceId(): string {
  const [deviceId] = useState(() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  });

  return deviceId;
}
