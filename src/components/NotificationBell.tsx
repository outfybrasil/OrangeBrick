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
          throw new Error("Permissão bloqueada. Ative as notificações nas configurações do seu navegador.");
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
    <div className="relative">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
          subscribed
            ? "bg-brand-orange/10 text-brand-orange border-brand-orange/30"
            : "bg-card-slate text-gray-300 border-gray-500/30 hover:border-brand-orange/50"
        } disabled:opacity-50`}
        aria-label={subscribed ? "Desativar notificações" : "Ativar notificações"}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        ) : (
          <span aria-hidden="true">🔔</span>
        )}
        <span className="hidden sm:inline">{subscribed ? "Notif. ativadas" : "Notificações"}</span>
      </button>
      {error && (
        <div
          role="alert"
          className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-red-500/40 bg-card-slate p-2.5 text-xs text-red-400 shadow-xl"
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

