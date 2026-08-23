"use client";

import { useToast, type ToastType } from "@/lib/contexts/ToastContext";

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <svg className="size-4 shrink-0 text-[#FF5E00]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg className="size-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="size-4 shrink-0 text-brand-orange" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Notificações do sistema"
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex max-w-md min-w-[18rem] items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#121319]/95 px-4 py-3 text-sm text-white shadow-2xl shadow-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <ToastIcon type={toast.type} />
            <div className="min-w-0">
              {toast.title && (
                <strong className="block truncate text-xs font-bold uppercase tracking-wider text-brand-orange">
                  {toast.title}
                </strong>
              )}
              <p className="line-clamp-2 text-xs font-medium text-gray-200">{toast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="size-6 shrink-0 rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-orange"
            aria-label="Fechar notificação"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className="size-4" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      ))}
    </aside>
  );
}
