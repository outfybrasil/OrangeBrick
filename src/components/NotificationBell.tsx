"use client";

import { useCallback, useEffect, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
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
    const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    navigator.serviceWorker.getRegistration(`${basePath}/`).then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(subscription));
    }).catch(() => setSubscribed(false));
  }, [basePath]);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Chave de notificação não configurada");
      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` });
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      });
      const raw = subscription.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys.auth) throw new Error("Assinatura inválida");
      await invokeFunction("manage-push-subscription", {
        action: "subscribe",
        endpoint: raw.endpoint,
        p256dh_key: raw.keys.p256dh,
        auth_key: raw.keys.auth,
        user_agent: navigator.userAgent,
      });
      setSubscribed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao ativar notificações");
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
      setError(cause instanceof Error ? cause.message : "Erro ao desativar notificações");
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
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${subscribed ? "bg-brand-orange/10 text-brand-orange border-brand-orange/30" : "bg-card-slate text-gray-300 border-gray-500/30"} disabled:opacity-50`}
        aria-label={subscribed ? "Desativar notificações" : "Ativar notificações"}
      >
        {loading ? <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" /> : <span aria-hidden="true">🔔</span>}
        <span className="hidden sm:inline">{subscribed ? "Notif. ativadas" : "Notificações"}</span>
      </button>
      {error && <p role="alert" className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-red-500/30 bg-card-slate p-2 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
