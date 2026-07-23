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
    <div className="pt-1">
      <NotificationBell />
    </div>
  );
}
