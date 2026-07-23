"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);

  const handleGoogleLogin = useCallback(async () => {
    if (!eligibilityConfirmed) return;
    await signInWithGoogle();
    onSuccess?.();
  }, [eligibilityConfirmed, onSuccess, signInWithGoogle]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background-void/90 px-3 py-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
        className="relative my-auto w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#191b21] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:max-h-[calc(100dvh-2rem)] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-xl text-lg font-bold text-[#aeb0b8] transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          aria-label="Fechar acesso à comunidade"
        >
          ×
        </button>

        <div className="pr-10">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 id="auth-modal-title" className="font-heading text-2xl font-bold text-white">
            Entre no Brickboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#b8bac2]">
            Use sua conta Google para comentar, reagir e publicar. O Orange Brick nunca recebe sua senha do Google.
          </p>
        </div>

        <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-[#c8c9cf] sm:mt-6">
          <input
            type="checkbox"
            checked={eligibilityConfirmed}
            onChange={(event) => setEligibilityConfirmed(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff5e00]"
          />
          <span>
            Confirmo que tenho 18 anos ou que participo com autorização e acompanhamento do meu responsável.
          </span>
        </label>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={!eligibilityConfirmed}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm font-bold text-[#25262a] transition-colors hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Entrar com Google
        </button>

        <p className="mt-4 text-center text-[11px] leading-5 text-[#8f919a]">
          Ao entrar, você concorda com os{" "}
          <Link href="/termos" className="text-brand-orange hover:text-white">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand-orange hover:text-white">
            Política de Privacidade
          </Link>.
        </p>
      </div>
    </div>
  );
}
