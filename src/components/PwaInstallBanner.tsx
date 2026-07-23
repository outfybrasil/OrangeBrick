"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const isDismissed = localStorage.getItem("ob_pwa_dismissed");
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("ob_pwa_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-card-slate/95 border border-brand-orange/40 backdrop-blur-xl p-4 rounded-2xl shadow-2xl space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-xl shrink-0">
            📲
          </div>
          <div>
            <h4 className="font-subtitle text-xs font-bold text-white uppercase tracking-wider">
              Instalar App Orange Brick
            </h4>
            <p className="text-[11px] text-gray-300 font-body mt-0.5">
              Acesse notícias e a comunidade direto da sua tela inicial.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-white p-1 text-xs font-bold"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleDismiss}
          className="flex-1 py-1.5 rounded-xl text-xs font-subtitle text-gray-400 hover:text-white bg-background-void/50 border border-brand-orange-muted/15 transition-colors"
        >
          Agora Não
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-1.5 rounded-xl text-xs font-subtitle font-bold bg-brand-orange text-white hover:bg-brand-orange/90 shadow-md transition-all"
        >
          Instalar App
        </button>
      </div>
    </div>
  );
}
