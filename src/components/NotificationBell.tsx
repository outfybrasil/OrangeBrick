"use client";

import { useState, useEffect, useCallback } from "react";

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0))) as Uint8Array<ArrayBuffer>;
}

function isSubscribed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ob_push_subscribed") === "true";
}

function setSubscribed(val: boolean) {
  localStorage.setItem("ob_push_subscribed", String(val));
}

export default function NotificationBell() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribedState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setSubscribedState(isSubscribed());
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
        ),
      });

      const raw = JSON.parse(JSON.stringify(sub));

      const supabase = (await import("@/lib/supabase/client")).createClient();
      await (supabase as any).from("push_subscriptions").insert({
        endpoint: raw.endpoint,
        p256dh_key: raw.keys.p256dh,
        auth_key: raw.keys.auth,
        user_agent: navigator.userAgent,
      });

      setSubscribedState(true);
      setSubscribed(true);
    } catch {
      setSubscribedState(false);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const unsubscribe = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        const supabase = (await import("@/lib/supabase/client")).createClient();
        await (supabase as any).from("push_subscriptions").delete().eq("endpoint", endpoint);
      }

      setSubscribedState(false);
      setSubscribed(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [loading]);

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
          subscribed
            ? "bg-brand-orange/10 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/15"
            : "bg-transparent text-gray-400 border-gray-500/20 hover:text-white hover:border-gray-500/40"
        } disabled:opacity-50`}
        aria-label={subscribed ? "Desativar notificações" : "Ativar notificações"}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
        <span className="hidden sm:inline">{subscribed ? "Notif. ativadas" : "Notificações"}</span>
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 bg-card-slate border border-brand-orange-muted/20 rounded-lg px-3 py-2 shadow-xl z-50 whitespace-nowrap">
          <p className="text-[10px] text-gray-400 font-mono">
            {subscribed
              ? "Você receberá notificações de novas matérias."
              : "Ative para receber notificações no navegador."}
          </p>
        </div>
      )}
    </div>
  );
}
