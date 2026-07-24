"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { AppNotification } from "@/lib/types/database";

export function useNotificationCenter() {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingReadIds = useRef(new Set<string>());

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const [listResult, countResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
      ]);

      if (listResult.error) throw listResult.error;
      if (countResult.error) throw countResult.error;
      const list = (listResult.data as AppNotification[]) || [];
      setNotifications(list);
      setUnreadCount(countResult.count || 0);
    } catch {
      setError("Não foi possível carregar os alertas. Verifique a conexão e tente de novo.");
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    queueMicrotask(() => void fetchNotifications());
    if (!user) return;

    const channelName = `notifs_${user.id}_${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications((prev) => (
            prev.some((notification) => notification.id === newNotif.id)
              ? prev
              : [newNotif, ...prev].slice(0, 50)
          ));
          if (!newNotif.is_read) setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();
    const refreshInterval = window.setInterval(() => void fetchNotifications(), 30000);
    const refreshOnFocus = () => void fetchNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user, supabase]);

  const markAsRead = useCallback(async (id: string) => {
    if (pendingReadIds.current.has(id)) return;
    pendingReadIds.current.add(id);
    try {
      const current = notifications.find((notification) => notification.id === id);
      if (!current || current.is_read) return;
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (updateError) throw updateError;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setError("Não foi possível marcar o alerta como lido.");
    } finally {
      pendingReadIds.current.delete(id);
    }
  }, [notifications, supabase]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (updateError) throw updateError;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      setError("Não foi possível marcar todos os alertas como lidos.");
    }
  }, [user, supabase]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      const removed = notifications.find((notification) => notification.id === id);
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
      if (removed && !removed.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
      return true;
    } catch {
      setError("Não foi possível apagar o alerta. Tente novamente.");
      return false;
    }
  }, [notifications, supabase]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return false;
    try {
      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) throw deleteError;
      setNotifications([]);
      setUnreadCount(0);
      return true;
    } catch {
      setError("Não foi possível limpar os alertas. Tente novamente.");
      return false;
    }
  }, [user, supabase]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
}
