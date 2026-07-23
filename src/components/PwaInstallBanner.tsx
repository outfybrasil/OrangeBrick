"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGE_EVENT, getConsent } from "@/lib/consent";

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
      if (!isDismissed && getConsent()) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    const handleConsentChange = () => {
      if (deferredPrompt && getConsent() && !localStorage.getItem("ob_pwa_dismissed")) {
        setShowBanner(true);
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  }, [deferredPrompt]);

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
    <section
      aria-labelledby="pwa-title"
      data-mobile-bottom-overlay
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 space-y-3 rounded-2xl border border-white/10 bg-[#191b21] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] sm:left-auto sm:right-4 sm:max-w-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-xl shrink-0">
            📲
          </div>
          <div>
            <h4 id="pwa-title" className="font-subtitle text-sm font-bold text-white">
              Instalar App Orange Brick
            </h4>
            <p className="text-[11px] text-gray-300 font-body mt-0.5">
              Acesse notícias e a comunidade direto da sua tela inicial.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar convite para instalar o aplicativo"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleDismiss}
          className="min-h-11 flex-1 rounded-xl border border-white/10 bg-background-void/50 text-xs text-gray-300 transition-colors hover:text-white"
        >
          Agora Não
        </button>
        <button
          onClick={handleInstall}
          className="min-h-11 flex-1 rounded-xl bg-brand-orange text-xs font-bold text-white transition-colors hover:bg-[#e95500]"
        >
          Instalar App
        </button>
      </div>
    </section>
  );
}
