"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotificationCenter } from "@/lib/hooks/useNotificationCenter";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { AppNotification } from "@/lib/types/database";
import NotificationBell from "@/components/NotificationBell";

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  const labels: Record<AppNotification["type"], string> = {
    reaction: "Curtida",
    comment: "Comentário",
    reply: "Resposta",
    system: "Aviso",
  };

  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
      {labels[type]}
    </span>
  );
}

function formatNotificationTime(value: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "agora";
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(new Date(value));
}

interface NotificationItemProps {
  notification: AppNotification;
  isDeleting: boolean;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  onOpen: (notification: AppNotification) => void;
}

function NotificationItem({
  notification,
  isDeleting,
  onDelete,
  onMarkRead,
  onOpen,
}: NotificationItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notification.is_read && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) onMarkRead(notification.id); },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [notification.id, notification.is_read, onMarkRead]);

  return (
    <div
      ref={ref}
      className={`group flex items-stretch border-b border-white/5 transition-colors last:border-0 ${
        notification.is_read ? "bg-transparent" : "bg-brand-orange/[0.06]"
      } hover:bg-white/[0.04]`}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left outline-none focus-visible:bg-white/[0.06]"
      >
        <span className="mt-1 w-16 shrink-0">
          <NotificationIcon type={notification.type} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block [overflow-wrap:anywhere] text-xs leading-relaxed ${
            notification.is_read ? "text-gray-400" : "font-medium text-gray-100"
          }`}>
            {notification.message}
          </span>
          <span className="mt-1 block text-xs text-gray-400">
            {formatNotificationTime(notification.created_at)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDelete(notification.id)}
        disabled={isDeleting}
        aria-label={`Apagar alerta: ${notification.message}`}
        className="my-1.5 mr-1.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:opacity-50"
      >
        {isDeleting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
        ) : (
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteNotification(id);
    setDeletingId(null);
  };

  const handleClear = async () => {
    setIsClearing(true);
    const cleared = await deleteAllNotifications();
    setIsClearing(false);
    if (cleared) setConfirmClear(false);
  };

  const handleOpen = (notification: AppNotification) => {
    void markAsRead(notification.id);
    setOpen(false);
    if (notification.reference_type === "profile" && profile?.username) {
      router.push(`/profile/${profile.username}`);
      return;
    }
    if (notification.reference_type === "achievement") {
      router.push("/brickboard/conquistas");
      return;
    }
    if (notification.reference_type === "ranking") {
      router.push("/brickboard/ranking");
      return;
    }
    router.push("/brickboard");
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-brand-orange-muted/20 bg-card-slate/80 text-gray-400 transition-all hover:border-brand-orange/40 hover:bg-card-slate hover:text-white"
        aria-label={unreadCount > 0 ? `Notificações: ${unreadCount} novas` : "Notificações"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white px-1 shadow-[0_0_6px_#FF5E00]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Central de notificações"
          className="fixed inset-x-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-50 flex max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-xl border border-brand-orange-muted/20 bg-[#12141C] shadow-[0_20px_55px_rgba(0,0,0,0.5)] animate-fade-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem] sm:max-h-[32rem]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-white">Notificações</h3>
              <p className="mt-0.5 text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? "nova" : "novas"}` : "Tudo em dia"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="min-h-11 rounded-xl px-2.5 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange/10"
                >
                  Marcar lidas
                </button>
              )}
              {notifications.length > 0 && !confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="min-h-11 rounded-xl px-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-500/10"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {confirmClear && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/[0.08] px-4 py-2.5">
              <p className="text-xs text-red-100">Apagar todos os alertas?</p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  disabled={isClearing}
                  className="min-h-11 rounded-xl px-3 text-xs font-semibold text-red-100/80 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleClear()}
                  disabled={isClearing}
                  className="min-h-11 rounded-xl bg-red-500/15 px-3 text-xs font-bold text-red-200 hover:bg-red-500/25 disabled:opacity-50"
                >
                  {isClearing ? "Apagando…" : "Apagar tudo"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/[0.08] px-4 py-2.5">
              <p className="text-xs leading-relaxed text-amber-100">{error}</p>
              <button
                type="button"
                onClick={() => void fetchNotifications()}
                className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold text-amber-100 hover:bg-amber-400/10"
              >
                Tentar de novo
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-xs text-gray-300">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-brand-orange" />
                Carregando alertas…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-gray-200">Tudo em dia.</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">
                  Curtidas, comentários e respostas aparecem aqui.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isDeleting={deletingId === notification.id}
                  onDelete={(id) => void handleDelete(id)}
                  onMarkRead={(id) => void markAsRead(id)}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>
          <div className="border-t border-white/10 px-4 py-3">
            <NotificationBell />
          </div>
        </div>
      )}
    </div>
  );
}
