"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getConsent, saveConsent } from "@/lib/consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent()) return;
    const frame = window.requestAnimationFrame(() => setShow(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const choose = (level: "accepted" | "denied") => {
    saveConsent(level);
    setShow(false);
  };

  if (!show) return null;

  return (
    <section
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
      data-mobile-bottom-overlay
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5"
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#17191f] shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="h-1 bg-brand-orange" />
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-5 sm:p-6">
          <div>
            <p id="consent-title" className="font-heading text-base font-bold text-white">
              Sua leitura, sua escolha
            </p>
            <p id="consent-description" className="mt-2 max-w-xl text-sm leading-6 text-[#b8bac2]">
              O site funciona com armazenamento essencial. Com sua permissão, também guardamos um
              identificador aleatório para reconhecer reações e medir leituras sem usar seu nome ou e-mail.{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-brand-orange underline decoration-brand-orange/40 underline-offset-4 hover:decoration-brand-orange"
              >
                Saiba mais
              </Link>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-[#d7d8dc] transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Só essenciais
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="min-h-11 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white transition-colors hover:bg-[#e95500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Permitir métricas
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
