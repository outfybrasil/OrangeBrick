"use client";

import { useState, useEffect } from "react";

const COOKIE_CONSENT_KEY = "ob-cookie-consent";

type ConsentLevel = "accepted" | "denied" | null;

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentLevel>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentLevel | null;
    if (!stored) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
    setConsent(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setConsent("accepted");
    setShow(false);
  };

  const handleDeny = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
    setConsent("denied");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-card-slate border border-brand-orange-muted/20 rounded-xl shadow-2xl p-5 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white mb-1">🍪 Cookies</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Usamos cookies essenciais para o funcionamento do site e cookies opcionais
              para analytics. Consulte nossa{" "}
              <a href="/privacidade" className="text-brand-orange hover:underline">Política de Privacidade</a>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeny}
              className="text-xs text-gray-400 hover:text-white border border-gray-600 px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Recusar
            </button>
            <button
              onClick={handleAccept}
              className="text-xs font-bold text-white bg-brand-orange hover:bg-brand-orange/90 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Aceitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
