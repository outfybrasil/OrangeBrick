"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { AppNotification } from "@/lib/types/database";

const POLL_INTERVAL = 15_000;

export function useNotificationCenter() {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      const list = (data as AppNotification[]) || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);

    if (!user) return () => clearInterval(interval);

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
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Orange Brick 🍊", {
                body: newNotif.message,
                icon: "/logos/Logo Tijolo Quebrado.PNG",
              });
            } catch {
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user, supabase]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await (supabase as any).from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, [user, supabase]);

  return { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead };
}
