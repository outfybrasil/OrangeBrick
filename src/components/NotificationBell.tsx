"use client";

import { useCallback, useEffect, useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  detectPlatform,
  isInAppBrowser,
  permissionMessage,
  permissionSteps,
  resolvePermissionOutcome,
  type PushPlatform,
} from "@/lib/push-permission";

const PUSH_STATE_EVENT = "ob-push-state";

type PushErrorState = {
  message: string;
  steps: string[];
};

class PushSetupError extends Error {
  steps: string[];

  constructor(message: string, steps: string[] = []) {
    super(message);
    this.name = "PushSetupError";
    this.steps = steps;
  }
}

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer;
}

function bufferToBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function currentPlatform() {
  return detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
}

function readPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function blockedError() {
  return new PushSetupError(permissionMessage("denied"), permissionSteps(currentPlatform()));
}

function dismissedError() {
  return new PushSetupError(permissionMessage("dismissed"), [
    "Toque em Tentar de novo e escolha Permitir quando o navegador perguntar.",
    "Se nenhuma janela aparecer, procure o ícone de permissão ao lado do endereço do site.",
  ]);
}

function toPushError(cause: unknown): PushErrorState {
  if (cause instanceof PushSetupError) {
    return { message: cause.message, steps: cause.steps };
  }
  if (cause instanceof DOMException) {
    if (cause.name === "NotAllowedError") {
      return { message: permissionMessage("denied"), steps: permissionSteps(currentPlatform()) };
    }
    if (cause.name === "AbortError") {
      return { message: "O navegador interrompeu a ativação. Tente de novo em alguns segundos.", steps: [] };
    }
    if (cause.name === "InvalidStateError") {
      return {
        message: "O navegador manteve uma assinatura antiga de alertas neste aparelho.",
        steps: ["Recarregue a página e toque em Receber alertas novamente."],
      };
    }
  }
  return {
    message: cause instanceof Error ? cause.message : "Não foi possível alterar os alertas.",
    steps: [],
  };
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
  try {
    localStorage.setItem("ob_push_sync", JSON.stringify({
      endpoint,
      userId,
      syncedAt: Date.now(),
    }));
  } catch {
    return;
  }
}

function clearSubscriptionSync() {
  try {
    localStorage.removeItem("ob_push_sync");
    return true;
  } catch {
    return false;
  }
}

function matchesApplicationServerKey(subscription: PushSubscription, publicKey: string) {
  const currentKey = subscription.options?.applicationServerKey;
  if (!currentKey) return true;
  return bufferToBase64Url(currentKey) === publicKey;
}

function notifyPushStateChange() {
  window.dispatchEvent(new Event(PUSH_STATE_EVENT));
}

export default function NotificationBell() {
  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [platform, setPlatform] = useState<PushPlatform>("desktop");
  const [requiresInstall, setRequiresInstall] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PushErrorState | null>(null);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined"
      || !("serviceWorker" in navigator)
      || !("PushManager" in window)
      || !("Notification" in window)
    ) return;

    setPermission(Notification.permission);
    try {
      const registration = await navigator.serviceWorker.getRegistration(`${basePath}/`);
      const subscription = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(subscription));
      if (subscription && user && shouldSyncSubscription(subscription.endpoint, user.id)) {
        const raw = subscription.toJSON();
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (raw.endpoint && raw.keys?.p256dh && raw.keys.auth && session?.access_token) {
          try {
            await invokeFunction("manage-push-subscription", {
              action: "subscribe",
              endpoint: raw.endpoint,
              p256dh_key: raw.keys.p256dh,
              auth_key: raw.keys.auth,
              user_agent: navigator.userAgent,
            }, { accessToken: session.access_token });
            saveSubscriptionSync(raw.endpoint, user.id);
          } catch {
            setError({
              message: "Os alertas estão ativos neste aparelho, mas a conta não foi sincronizada. Use Tentar de novo para sincronizar.",
              steps: [],
            });
          }
        }
      }
    } catch {
      setSubscribed(false);
    }
  }, [basePath, user]);

  const refreshState = useCallback(() => {
    setPermission(readPermission());
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    const devicePlatform = detectPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    queueMicrotask(() => {
      setMounted(true);
      setSupported(isSupported);
      setPlatform(devicePlatform);
      setRequiresInstall(devicePlatform === "ios" && !isStandalone);
      setPermission(readPermission());
    });
    if (!isSupported) return;

    queueMicrotask(() => void refresh());

    const onFocus = () => refreshState();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshState();
    };
    window.addEventListener(PUSH_STATE_EVENT, onFocus);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener(PUSH_STATE_EVENT, onFocus);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, refreshState]);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (!window.isSecureContext) {
        throw new PushSetupError(
          "Os alertas exigem uma conexão segura (HTTPS) para funcionar.",
          ["Abra o Orange Brick pelo endereço oficial https://orangebrick.blog."]
        );
      }
      if (!("Notification" in window)) {
        throw new PushSetupError(
          "Este navegador não oferece alertas com o app fechado.",
          ["Abra o Orange Brick no Chrome, no Edge ou no Safari atualizado."]
        );
      }
      if (isInAppBrowser(navigator.userAgent)) {
        throw new PushSetupError(
          "Este navegador interno não permite ativar alertas.",
          [
            "Abra o Orange Brick no Chrome (Android) ou no Safari (iPhone).",
            "Toque em Receber alertas novamente.",
          ]
        );
      }

      if (Notification.permission === "denied") throw blockedError();
      if (Notification.permission !== "granted") {
        const requested = await Notification.requestPermission() as NotificationPermission | undefined;
        const outcome = resolvePermissionOutcome(requested, Notification.permission);
        setPermission(Notification.permission);
        if (outcome === "denied") throw blockedError();
        if (outcome !== "granted") {
          throw dismissedError();
        }
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new PushSetupError("Os alertas ainda não foram configurados no servidor.");

      const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` });
      await registration.update().catch(() => undefined);

      const existingSubscription = await registration.pushManager.getSubscription();
      let subscription = existingSubscription;
      if (subscription && !matchesApplicationServerKey(subscription, publicKey)) {
        const removed = await subscription.unsubscribe().catch(() => false);
        if (!removed) {
          throw new PushSetupError(
            "Este aparelho tem uma assinatura antiga de alertas que não pôde ser removida.",
            ["Recarregue a página e tente de novo. Se continuar, desative os alertas nas configurações do navegador."]
          );
        }
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        });
      }

      const raw = subscription.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys.auth) {
        throw new PushSetupError(
          "O navegador criou um alerta incompleto.",
          ["Atualize a página e tente novamente."]
        );
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      let synced = false;
      try {
        await invokeFunction("manage-push-subscription", {
          action: "subscribe",
          endpoint: raw.endpoint,
          p256dh_key: raw.keys.p256dh,
          auth_key: raw.keys.auth,
          user_agent: navigator.userAgent,
        }, { accessToken: session?.access_token });
        synced = true;
        if (user) saveSubscriptionSync(raw.endpoint, user.id);
      } catch {
        synced = false;
      }

      setPermission("granted");
      setSubscribed(true);
      notifyPushStateChange();
      if (!synced) {
        setError({
          message: "Os alertas estão ativos neste aparelho, mas a conta não foi sincronizada. Use Tentar de novo para sincronizar.",
          steps: [],
        });
      }
    } catch (cause) {
      setError(toPushError(cause));
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
        let localRevoked = false;
        try {
          localRevoked = await subscription.unsubscribe();
        } catch {
          localRevoked = false;
        }
        setSubscribed(!localRevoked);
        clearSubscriptionSync();
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        let serverRevoked = false;
        try {
          await invokeFunction(
            "manage-push-subscription",
            { action: "unsubscribe", endpoint },
            { accessToken: session?.access_token }
          );
          serverRevoked = true;
        } catch {
          serverRevoked = false;
        }
        if (!localRevoked || !serverRevoked) {
          setError({
            message: [
              !localRevoked && "O navegador não confirmou o desligamento neste aparelho.",
              !serverRevoked && "O servidor não confirmou a remoção da assinatura.",
            ].filter(Boolean).join(" "),
            steps: localRevoked ? [] : ["Recarregue a página e tente desativar novamente."],
          });
        }
        notifyPushStateChange();
      } else {
        clearSubscriptionSync();
        setSubscribed(false);
        notifyPushStateChange();
      }
    } catch (cause) {
      setError(toPushError(cause));
    } finally {
      setLoading(false);
    }
  }, [basePath, loading]);

  if (!mounted) return null;

  if (!supported) {
    return (
      <p className="max-w-64 text-xs leading-relaxed text-gray-300">
        {platform === "ios"
          ? "Atualize o iPhone para o iOS 16.4 ou mais recente e adicione o Orange Brick à Tela de Início para receber alertas."
          : "Este navegador não oferece alertas com o app fechado. Abra o Orange Brick no Chrome, no Edge ou no Safari atualizado."}
      </p>
    );
  }

  if (requiresInstall) {
    return (
      <p className="max-w-64 text-xs leading-relaxed text-gray-300">
        No iPhone ou iPad, abra o Orange Brick no Safari e toque em Compartilhar → Adicionar à Tela de Início. Só o app instalado recebe alertas com a tela fechada.
      </p>
    );
  }

  const blocked = permission === "denied";
  const label = subscribed ? "Desativar alertas" : blocked ? "Alertas bloqueados" : "Receber alertas";

  return (
    <div className="relative inline-block">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        aria-label={subscribed ? "Desativar alertas" : blocked ? "Ver como liberar os alertas" : "Receber alertas"}
        aria-describedby={error ? "push-notification-error" : undefined}
        className={`flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-colors ${
          subscribed
            ? "bg-brand-orange/15 text-brand-orange border-brand-orange/40"
            : "bg-card-slate/90 text-gray-200 border-brand-orange-muted/20 hover:border-brand-orange/40 hover:text-white"
        } disabled:opacity-50`}
        title={
          subscribed
            ? "Desativar alertas neste aparelho"
            : blocked
              ? "Veja como liberar os alertas neste navegador"
              : "Receber alertas de novas matérias"
        }
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5 text-brand-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
          </svg>
        )}
        <span className="whitespace-nowrap">{label}</span>
      </button>

      {error && (
        <div
          id="push-notification-error"
          role="alert"
          className="absolute bottom-full left-0 z-50 mb-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-red-500/40 bg-[#12141C] p-3 text-left text-xs text-red-300 shadow-2xl animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="leading-relaxed">{error.message}</p>
            <button
              onClick={() => setError(null)}
              aria-label="Fechar aviso de alertas"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white"
            >
              ×
            </button>
          </div>
          {error.steps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-red-200/90">
              {error.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => void subscribe()}
              disabled={loading}
              className="min-h-9 rounded-lg border border-red-400/40 px-3 text-[11px] font-bold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white disabled:opacity-50"
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
