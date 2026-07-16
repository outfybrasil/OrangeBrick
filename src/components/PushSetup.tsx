"use client";

import { useEffect } from "react";
import NotificationBell from "./NotificationBell";

export default function PushSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <NotificationBell />
    </div>
  );
}
