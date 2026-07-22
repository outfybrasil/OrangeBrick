"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotificationCenter } from "@/lib/hooks/useNotificationCenter";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { AppNotification } from "@/lib/types/database";

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  switch (type) {
    case "reaction":
      return <span className="text-sm">🔥</span>;
    case "comment":
      return <span className="text-sm">💬</span>;
    case "reply":
      return <span className="text-sm">↩️</span>;
    case "system":
      return <span className="text-sm">📢</span>;
  }
}

function NotificationItem({ n, onMarkRead }: { n: AppNotification; onMarkRead: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!n.is_read && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) onMarkRead(n.id); },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [n.id, n.is_read, onMarkRead]);

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        n.is_read ? "opacity-50" : "bg-brand-orange/5"
      } hover:bg-card-slate/60 border-b border-brand-orange-muted/5 last:border-0`}
    >
      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={n.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-relaxed ${n.is_read ? "text-gray-500" : "text-gray-300"}`}>
          {n.message}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">
          {new Date(n.created_at).toLocaleDateString("pt-BR", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-brand-orange-muted/20 text-gray-400 hover:text-white hover:border-brand-orange/40 bg-card-slate/80 hover:bg-card-slate transition-all cursor-pointer"
        aria-label="Notificações"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-brand-orange text-[9px] font-bold text-white px-1 shadow-[0_0_6px_#FF5E00]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-96 rounded-xl border border-brand-orange-muted/20 bg-[#12141C] shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-orange-muted/10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[9px] text-brand-orange hover:underline cursor-pointer"
              >
                Marcar todas lidas
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-gray-500">
                Nenhuma notificação ainda.
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} n={n} onMarkRead={markAsRead} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
