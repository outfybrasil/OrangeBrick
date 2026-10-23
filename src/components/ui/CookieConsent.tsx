"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CONSENT_CHANGE_EVENT, getAdvertisingConsent, getConsent, saveConsent } from "@/lib/consent";

const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? "";
const adSlots = [process.env.NEXT_PUBLIC_ADSENSE_HOME_SLOT_ID, process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_SLOT_ID];
const adsenseEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true"
  && /^pub-\d{16}$/.test(publisherId)
  && adSlots.some((slotId) => /^\d+$/.test(slotId ?? ""));

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [allowMetrics, setAllowMetrics] = useState(() => getConsent() === "accepted");
  const [allowAdvertising, setAllowAdvertising] = useState(() => getAdvertisingConsent() === true);
  const consentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!show || !consentRef.current) return;
    const element = consentRef.current;
    const update = () => document.documentElement.style.setProperty("--bottom-overlay-height", `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--bottom-overlay-height");
    };
  }, [show]);

  useEffect(() => {
    const consent = getConsent();
    const advertisingConsent = getAdvertisingConsent();
    if (consent !== null && (!adsenseEnabled || advertisingConsent !== null)) return;
    const frame = window.requestAnimationFrame(() => setShow(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const stopAdvertising = () => {
      if (getAdvertisingConsent() !== true && document.getElementById("orange-brick-adsense")) {
        window.location.reload();
      }
    };

    window.addEventListener(CONSENT_CHANGE_EVENT, stopAdvertising);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, stopAdvertising);
  }, []);

  const choose = (metrics: boolean, advertising: boolean) => {
    saveConsent(metrics ? "accepted" : "denied", adsenseEnabled ? advertising : null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <section
      ref={consentRef}
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
      data-mobile-bottom-overlay
      className="fixed inset-x-0 bottom-0 z-[70] max-h-[calc(100dvh-4rem)] overflow-y-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5 watch-hidden"
    >
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#17191f] shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="h-1 bg-brand-orange" />
        <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-5 sm:p-6">
          <div>
            <p id="consent-title" className="font-heading text-sm font-bold text-white sm:text-base">
              Suas preferências de privacidade
            </p>
            <p id="consent-description" className="mt-1 max-w-xl text-xs leading-4 text-[#b8bac2] sm:mt-2 sm:text-sm sm:leading-6">
              {adsenseEnabled
                ? "O armazenamento essencial mantém o site funcionando. Você pode escolher separadamente as métricas de leitura e os anúncios do Google, que podem usar cookies para personalização."
                : "O site funciona com armazenamento essencial. Com sua permissão, também guardamos um identificador aleatório para reconhecer reações e medir leituras sem usar seu nome ou e-mail."}{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-brand-orange underline decoration-brand-orange/40 underline-offset-4 hover:decoration-brand-orange"
              >
                Saiba mais
              </Link>.
            </p>
            {adsenseEnabled && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={allowMetrics}
                    onChange={(event) => setAllowMetrics(event.target.checked)}
                    className="mt-0.5 size-5 accent-[#FF5E00]"
                  />
                  <span>
                    Métricas de leitura
                    <span className="mt-0.5 block text-xs leading-5 text-[#b8bac2]">Reações e leituras agregadas do site.</span>
                  </span>
                </label>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={allowAdvertising}
                    onChange={(event) => setAllowAdvertising(event.target.checked)}
                    className="mt-0.5 size-5 accent-[#FF5E00]"
                  />
                  <span>
                    Publicidade do Google
                    <span className="mt-0.5 block text-xs leading-5 text-[#b8bac2]">Permite carregar anúncios e cookies de publicidade.</span>
                  </span>
                </label>
              </div>
            )}
          </div>
          {adsenseEnabled ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => choose(false, false)}
                className="min-h-11 rounded-xl border border-white/15 px-3 text-xs font-semibold text-[#d7d8dc] transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:px-4 sm:text-sm"
              >
                Só essenciais
              </button>
              <button
                type="button"
                onClick={() => choose(allowMetrics, allowAdvertising)}
                className="min-h-11 rounded-xl border border-brand-orange/50 bg-brand-orange/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-orange/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:px-4 sm:text-sm"
              >
                Salvar escolhas
              </button>
              <button
                type="button"
                onClick={() => choose(true, true)}
                className="min-h-11 rounded-xl bg-brand-orange px-3 text-xs font-bold text-white transition-colors hover:bg-[#e95500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm"
              >
                Aceitar tudo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => choose(false, false)}
                className="min-h-10 rounded-xl border border-white/15 px-3 text-xs font-semibold text-[#d7d8dc] transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:min-h-11 sm:px-4 sm:text-sm"
              >
                Só essenciais
              </button>
              <button
                type="button"
                onClick={() => choose(true, false)}
                className="min-h-10 rounded-xl bg-brand-orange px-3 text-xs font-bold text-white transition-colors hover:bg-[#e95500] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-11 sm:px-5 sm:text-sm"
              >
                Permitir métricas
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
