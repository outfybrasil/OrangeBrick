"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ToastType = "success" | "info" | "error";

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  show: (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const type = options?.type || "info";
      const duration = options?.duration ?? 3500;
      const newItem: ToastItem = {
        id,
        message,
        title: options?.title,
        type,
        duration,
      };

      setToasts((current) => [...current.slice(-4), newItem]);

      if (duration > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      show(message, { title, type: "success" });
    },
    [show]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      show(message, { title, type: "error" });
    },
    [show]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      show(message, { title, type: "info" });
    },
    [show]
  );

  const value = useMemo(
    () => ({ toasts, show, success, error, info, dismiss }),
    [toasts, show, success, error, info, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser utilizado dentro de um ToastProvider");
  }
  return context;
}
