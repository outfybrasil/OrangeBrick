"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Check, Contrast, Minus, Plus, RotateCcw, X } from "lucide-react";

const STORAGE_KEY = "orange-accessibility";

type Preferences = {
  fontScale: number;
  highContrast: boolean;
};

const DEFAULTS: Preferences = { fontScale: 1, highContrast: false };

function applyPreferences(preferences: Preferences) {
  document.documentElement.style.setProperty("--reader-font-scale", String(preferences.fontScale));
  document.documentElement.classList.toggle("high-contrast", preferences.highContrast);
}

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Preferences | null;
      if (saved) {
        applyPreferences(saved);
        const timer = window.setTimeout(() => setPreferences(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [isOpen]);

  const update = (next: Preferences) => {
    setPreferences(next);
    applyPreferences(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <div ref={panelRef} className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[65] sm:bottom-5 sm:right-5">
      {isOpen && (
        <section
          id="accessibility-panel"
          aria-label="Preferências de acessibilidade"
          className="mb-3 w-[min(22rem,calc(100vw-1.5rem))] border border-white/15 bg-[#15161b] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.48)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-extrabold text-white">Leitura acessível</h2>
              <p className="mt-1 text-xs leading-5 text-[#bfc1c9]">Ajustes ficam salvos neste dispositivo.</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar preferências" className="flex min-h-11 min-w-11 items-center justify-center text-gray-300 hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Tamanho do texto</p>
                <p className="mt-0.5 text-xs text-[#bfc1c9]">{Math.round(preferences.fontScale * 100)}%</p>
              </div>
              <div className="flex items-center border border-white/15">
                <button type="button" aria-label="Diminuir texto" disabled={preferences.fontScale <= 0.9} onClick={() => update({ ...preferences, fontScale: Math.max(0.9, preferences.fontScale - 0.1) })} className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-35 hover:bg-white/5">
                  <Minus size={17} />
                </button>
                <span className="min-w-12 text-center text-xs font-bold tabular-nums text-white">Aa</span>
                <button type="button" aria-label="Aumentar texto" disabled={preferences.fontScale >= 1.3} onClick={() => update({ ...preferences, fontScale: Math.min(1.3, preferences.fontScale + 0.1) })} className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-35 hover:bg-white/5">
                  <Plus size={17} />
                </button>
              </div>
            </div>

            <button type="button" aria-pressed={preferences.highContrast} onClick={() => update({ ...preferences, highContrast: !preferences.highContrast })} className="mt-4 flex min-h-12 w-full items-center justify-between border border-white/15 px-3 text-left hover:bg-white/5">
              <span className="flex items-center gap-3 text-sm font-bold text-white"><Contrast size={18} /> Alto contraste</span>
              <span className={`flex h-6 w-6 items-center justify-center border ${preferences.highContrast ? "border-brand-orange bg-brand-orange text-white" : "border-white/20 text-transparent"}`}><Check size={15} /></span>
            </button>

            <button type="button" onClick={() => update(DEFAULTS)} disabled={preferences.fontScale === 1 && !preferences.highContrast} className="mt-3 flex min-h-11 items-center gap-2 text-xs font-bold text-[#bfc1c9] hover:text-white disabled:opacity-35">
              <RotateCcw size={15} /> Restaurar padrão
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label="Abrir preferências de acessibilidade"
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        onClick={() => setIsOpen((current) => !current)}
        className="ml-auto flex h-12 w-12 items-center justify-center border border-brand-orange/60 bg-[#15161b] text-brand-orange shadow-[0_10px_32px_rgba(0,0,0,0.4)] transition-colors hover:bg-brand-orange hover:text-white"
      >
        <Accessibility size={22} />
      </button>
    </div>
  );
}
