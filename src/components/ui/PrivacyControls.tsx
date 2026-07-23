"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { clearConsent, DEVICE_STORAGE_KEY } from "@/lib/consent";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { invokeFunction } from "@/lib/supabase/functions";

type ActionState = "idle" | "exporting" | "deleting";

export function PrivacyControls() {
  const { user } = useAuth();
  const [action, setAction] = useState<ActionState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const dialogRef = useModalDialog<HTMLDivElement>(showDelete, () => setShowDelete(false));

  const deviceHeaders = () => {
    const headers = new Headers();
    const deviceId = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (deviceId) headers.set("x-orange-brick-device", deviceId);
    return headers;
  };

  const exportData = async () => {
    setAction("exporting");
    setMessage(null);
    try {
      const response = await fetch("/api/user/data", {
        headers: deviceHeaders(),
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Falha ao preparar o arquivo");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orange-brick-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Cópia dos dados gerada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível exportar os dados.");
    } finally {
      setAction("idle");
    }
  };

  const revokeOptionalData = async () => {
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await invokeFunction("manage-push-subscription", {
          action: "unsubscribe",
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }
    } catch {
      setMessage("Preferências locais apagadas. A revogação do push será repetida pelo navegador.");
    }

    clearConsent();
    setMessage("Preferências opcionais removidas. O banner será exibido novamente na próxima visita.");
  };

  const deleteAccount = async () => {
    if (confirmText !== "EXCLUIR") return;
    setAction("deleting");
    setMessage(null);
    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: deviceHeaders(),
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("A exclusão não pôde ser concluída");
      clearConsent();
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a conta.");
      setAction("idle");
      setShowDelete(false);
    }
  };

  return (
    <section aria-labelledby="privacy-controls-title" className="mt-10 rounded-2xl border border-white/10 bg-card-slate/55 p-5 sm:p-6">
      <h2 id="privacy-controls-title" className="text-xl font-bold text-white">
        Controle seus dados
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8bac2]">
        Revogue preferências no dispositivo a qualquer momento. Se estiver conectado, também pode baixar uma cópia ou excluir sua conta.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={revokeOptionalData}
          className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/5"
        >
          Revogar preferências
        </button>
        {user && (
          <>
            <button
              type="button"
              onClick={exportData}
              disabled={action !== "idle"}
              className="min-h-11 rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-4 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange/15 disabled:opacity-50"
            >
              {action === "exporting" ? "Preparando dados…" : "Baixar meus dados"}
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              disabled={action !== "idle"}
              className="min-h-11 rounded-xl border border-red-400/35 px-4 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Excluir minha conta
            </button>
          </>
        )}
      </div>

      {message && (
        <p role="status" className="mt-4 text-sm text-[#d2d3d8]">
          {message}
        </p>
      )}

      {showDelete && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-background-void/90 px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDelete(false);
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            tabIndex={-1}
            className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-red-400/25 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <h3 id="delete-account-title" className="text-xl font-bold text-white">
              Excluir conta definitivamente?
            </h3>
            <p id="delete-account-description" className="mt-3 text-sm leading-6 text-[#b8bac2]">
              Seus dados de perfil e participação serão removidos. Digite <strong className="text-white">EXCLUIR</strong> para confirmar.
            </p>
            <label htmlFor="delete-account-confirmation" className="mt-5 block text-xs font-bold text-[#d2d3d8]">
              Confirmação
            </label>
            <input
              id="delete-account-confirmation"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-background-void px-3 text-sm text-white outline-none focus:border-red-400"
            />
            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[#b8bac2] hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={confirmText !== "EXCLUIR" || action === "deleting"}
                className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action === "deleting" ? "Excluindo…" : "Excluir agora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
