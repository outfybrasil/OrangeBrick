"use client";

import { useCallback, useEffect, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer;
}

export default function NotificationBell() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    navigator.serviceWorker
      .getRegistration(`${basePath}/`)
      .then(async (registration) => {
        if (!registration) {
          setSubscribed(false);
          return;
        }
        const subscription = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(subscription));
      })
      .catch(() => setSubscribed(false));
  }, [basePath]);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          throw new Error("Permissão bloqueada nas configurações do seu navegador.");
        }
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            throw new Error("Permissão de notificação não foi concedida.");
          }
        }
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Chave de notificação VAPID não configurada.");

      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      });

      const raw = subscription.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys.auth) throw new Error("Assinatura de notificação inválida.");

      await invokeFunction("manage-push-subscription", {
        action: "subscribe",
        endpoint: raw.endpoint,
        p256dh_key: raw.keys.p256dh,
        auth_key: raw.keys.auth,
        user_agent: navigator.userAgent,
      });

      setSubscribed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao ativar notificações.");
    } finally {
      setLoading(false);
    }
  }, [basePath, loading]);

  const unsubscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${basePath}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await invokeFunction("manage-push-subscription", { action: "unsubscribe", endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao desativar notificações.");
    } finally {
      setLoading(false);
    }
  }, [basePath, loading]);

  if (!mounted || !supported) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-subtitle font-bold border transition-all cursor-pointer shadow-xl backdrop-blur-md ${
          subscribed
            ? "bg-brand-orange/15 text-brand-orange border-brand-orange/40"
            : "bg-card-slate/90 text-gray-200 border-brand-orange-muted/20 hover:border-brand-orange/40 hover:text-white"
        } disabled:opacity-50`}
        title={subscribed ? "Notificações ativas (Clique para gerenciar)" : "Ativar notificações em tempo real"}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5 text-brand-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
          </svg>
        )}
        <span className="whitespace-nowrap">{subscribed ? "Notificações Ativas" : "Ativar Notificações"}</span>
      </button>

      {error && (
        <div
          role="alert"
          className="absolute top-full right-0 mt-2 w-60 rounded-xl border border-red-500/40 bg-[#12141C] p-3 text-xs text-red-400 shadow-2xl z-50 animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-gray-400 hover:text-white shrink-0 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
