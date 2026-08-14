"use client";

import { useCallback, useEffect, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer;
}

function pushErrorMessage(cause: unknown) {
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError") {
      return "Os alertas estão bloqueados. Libere as notificações nas configurações do navegador.";
    }
    if (cause.name === "AbortError") {
      return "O navegador interrompeu a ativação. Tente de novo em alguns segundos.";
    }
    if (cause.name === "InvalidStateError") {
      return "Instale o Orange Brick na tela inicial e tente novamente.";
    }
  }
  return cause instanceof Error ? cause.message : "Não foi possível alterar os alertas.";
}

function shouldSyncSubscription(endpoint: string, userId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem("ob_push_sync") || "{}") as {
      endpoint?: string;
      userId?: string;
      syncedAt?: number;
    };
    return saved.endpoint !== endpoint
      || saved.userId !== userId
      || !saved.syncedAt
      || Date.now() - saved.syncedAt > 6 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function saveSubscriptionSync(endpoint: string, userId: string) {
  localStorage.setItem("ob_push_sync", JSON.stringify({
    endpoint,
    userId,
    syncedAt: Date.now(),
  }));
}

export default function NotificationBell() {
  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [requiresInstall, setRequiresInstall] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    queueMicrotask(() => {
      setMounted(true);
      setSupported(isSupported);
      setRequiresInstall(isIos && !isStandalone);
    });
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
        if (subscription && user && shouldSyncSubscription(subscription.endpoint, user.id)) {
          try {
            const raw = subscription.toJSON();
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (raw.endpoint && raw.keys?.p256dh && raw.keys.auth && session?.access_token) {
              await invokeFunction("manage-push-subscription", {
                action: "subscribe",
                endpoint: raw.endpoint,
                p256dh_key: raw.keys.p256dh,
                auth_key: raw.keys.auth,
                user_agent: navigator.userAgent,
              }, { accessToken: session.access_token });
              saveSubscriptionSync(raw.endpoint, user.id);
            }
          } catch {
            setError("Os alertas estão ativos neste aparelho, mas a conta não foi sincronizada. Toque novamente para tentar.");
          }
        }
      })
      .catch(() => setSubscribed(false));
  }, [basePath, user]);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          throw new Error("Os alertas estão bloqueados. Libere as notificações nas configurações do navegador.");
        }
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            throw new Error("Sem permissão, o Orange Brick não consegue avisar quando o app está fechado.");
          }
        }
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Os alertas ainda não foram configurados no servidor.");

      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` });
      await registration.update().catch(() => undefined);

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        });

      const raw = subscription.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys.auth) {
        throw new Error("O navegador criou um alerta incompleto. Atualize a página e tente novamente.");
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await invokeFunction("manage-push-subscription", {
        action: "subscribe",
        endpoint: raw.endpoint,
        p256dh_key: raw.keys.p256dh,
        auth_key: raw.keys.auth,
        user_agent: navigator.userAgent,
      }, { accessToken: session?.access_token });

      if (user) saveSubscriptionSync(raw.endpoint, user.id);
      setSubscribed(true);
    } catch (cause) {
      setError(pushErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [basePath, loading, user]);

  const unsubscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${basePath}/`);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        setSubscribed(false);
        localStorage.removeItem("ob_push_sync");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        try {
          await invokeFunction(
            "manage-push-subscription",
            { action: "unsubscribe", endpoint },
            { accessToken: session?.access_token }
          );
        } catch {
          setError("Os alertas foram desligados neste aparelho. O servidor removerá a assinatura antiga automaticamente.");
        }
      }
      localStorage.removeItem("ob_push_sync");
      setSubscribed(false);
    } catch (cause) {
      setError(pushErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [basePath, loading]);

  if (!mounted) return null;

  if (!supported || requiresInstall) {
    if (!requiresInstall) return null;
    return (
      <p className="max-w-64 text-xs leading-relaxed text-gray-300">
        No iPhone, adicione o Orange Brick à Tela de Início para receber alertas mesmo com o app fechado.
      </p>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        aria-label={subscribed ? "Desativar alertas" : "Ativar alertas"}
        aria-describedby={error ? "push-notification-error" : undefined}
        className={`flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
          subscribed
            ? "bg-brand-orange/15 text-brand-orange border-brand-orange/40"
            : "bg-card-slate/90 text-gray-200 border-brand-orange-muted/20 hover:border-brand-orange/40 hover:text-white"
        } disabled:opacity-50`}
        title={subscribed ? "Desativar alertas neste aparelho" : "Receber alertas de novas matérias"}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5 text-brand-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
          </svg>
        )}
        <span className="whitespace-nowrap">{subscribed ? "Alertas ativos" : "Receber alertas"}</span>
      </button>

      {error && (
        <div
          id="push-notification-error"
          role="alert"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(15rem,calc(100vw-2rem))] rounded-xl border border-red-500/40 bg-[#12141C] p-3 text-xs text-red-300 shadow-2xl animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="Fechar aviso de alertas"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
