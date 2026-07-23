"use client";

import { useEffect } from "react";
import NotificationBell from "./NotificationBell";

export default function PushSetup() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => undefined);
    }
  }, [basePath]);

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40">
      <NotificationBell />
    </div>
  );
}
