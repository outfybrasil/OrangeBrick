"use client";

import { useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { safeReturnTo } from "@/lib/auth/return-to";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, onSuccess, initialTab = "login" }: AuthModalProps) {
  const { user, signInWithGoogle, savedAccounts, switchAccount, removeAccount } = useAuth();
  const router = useRouter();
  const emailAuthEnabled = process.env.NEXT_PUBLIC_EMAIL_AUTH_ENABLED !== "false";
  const [activeTab, setActiveTab] = useState<"login" | "signup">(initialTab);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const dialogRef = useModalDialog<HTMLDivElement>(isOpen, onClose);
  const [mounted, setMounted] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    if (!eligibilityConfirmed || isSigningIn) return;
    setIsSigningIn(true);
    setLoginError(null);
    const returnTo = safeReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    try {
      await signInWithGoogle(returnTo);
      onSuccess?.();
    } catch {
      setLoginError("Não foi possível entrar com Google. Tente novamente.");
    } finally {
      setIsSigningIn(false);
    }
  }, [eligibilityConfirmed, isSigningIn, onSuccess, signInWithGoogle]);

  const handleQuickSwitch = useCallback(async (accountUserId: string) => {
    setSwitchingUserId(accountUserId);
    setLoginError(null);
    try {
      const ok = await switchAccount(accountUserId);
      if (ok) {
        onSuccess?.();
        onClose();
      } else {
        setLoginError("A sessão desta conta expirou. Entre novamente com suas credenciais.");
      }
    } catch {
      setLoginError("Não foi possível alternar de conta. Tente novamente.");
    } finally {
      setSwitchingUserId(null);
    }
  }, [switchAccount, onSuccess, onClose]);

  const navigateToCredentialAuth = (path: "/entrar" | "/cadastro") => {
    const returnTo = safeReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    onClose();
    router.push(`${path}?next=${encodeURIComponent(returnTo)}`);
  };

  if (!isOpen) return null;

  const selectableAccounts = user
    ? savedAccounts.filter((acc) => acc.userId !== user.id)
    : savedAccounts;

  const modalContent = (
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
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 id="auth-modal-title" className="font-heading text-2xl font-bold text-white">
            {user ? "Adicionar ou alternar conta" : activeTab === "signup" ? "Criar conta na comunidade" : "Entre para participar"}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm leading-5 sm:leading-6 text-[#b8bac2]">
            {user
              ? "Alterne para outra conta salva ou acesse com uma nova conta."
              : activeTab === "signup"
              ? "Cadastre-se para comentar, votar em lançamentos e debater com a comunidade."
              : emailAuthEnabled
              ? "Entre com Google ou e-mail para comentar, reagir e publicar."
              : "Entre com Google para comentar, reagir e publicar."}
          </p>
        </div>

        {!user && emailAuthEnabled && (
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`min-h-10 rounded-lg text-xs font-bold transition-all ${
                activeTab === "login"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`min-h-10 rounded-lg text-xs font-bold transition-all ${
                activeTab === "signup"
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>
        )}

        {activeTab === "signup" ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 p-4">
              <div className="flex items-center gap-2 text-brand-orange font-bold text-xs uppercase tracking-wider mb-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Cadastro Completo por E-mail</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Não quer vincular o Google? Crie sua identidade com apelido, @username, senha e plataformas favoritas.
              </p>
              <button
                type="button"
                onClick={() => navigateToCredentialAuth("/cadastro")}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 text-xs font-bold text-white transition-all hover:bg-[#ff7526]"
              >
                <span>Abrir formulário de cadastro</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="my-3 flex items-center gap-3 text-xs text-gray-500">
              <span className="h-px flex-1 bg-white/10" />
              <span>ou cadastre com Google</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-[#c8c9cf]">
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
              disabled={!eligibilityConfirmed || isSigningIn}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm font-bold text-[#25262a] transition-colors hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isSigningIn ? "Conectando ao Google…" : "Cadastrar com Google"}
            </button>
          </div>
        ) : (
          <>
            {selectableAccounts.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Contas salvas neste dispositivo
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectableAccounts.map((account) => {
                    const isSwitching = switchingUserId === account.userId;
                    return (
                      <div
                        key={account.userId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5 transition-colors hover:border-brand-orange/40 hover:bg-black/35"
                      >
                        <button
                          type="button"
                          disabled={Boolean(switchingUserId)}
                          onClick={() => handleQuickSwitch(account.userId)}
                          className="flex flex-1 items-center gap-3 text-left min-w-0"
                        >
                          {account.avatarUrl ? (
                            <img
                              src={account.avatarUrl}
                              alt={account.nickname}
                              referrerPolicy="no-referrer"
                              className="h-9 w-9 rounded-full object-cover shrink-0 border border-brand-orange/40 bg-[#08090C]"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-sm shrink-0">
                              {account.nickname.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-white truncate">
                              {account.nickname}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              @{account.username}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={Boolean(switchingUserId)}
                            onClick={() => handleQuickSwitch(account.userId)}
                            className="flex items-center gap-1 rounded-lg bg-brand-orange/20 px-2.5 py-1.5 text-xs font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                          >
                            {isSwitching ? (
                              <div className="w-3.5 h-3.5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <span>Entrar</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAccount(account.userId)}
                            title="Remover deste dispositivo"
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="my-4 flex items-center gap-3 text-xs text-gray-500">
                  <span className="h-px flex-1 bg-white/10" />
                  <span>ou acesse outra conta</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              </div>
            )}

            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-[#c8c9cf]">
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
              disabled={!eligibilityConfirmed || isSigningIn}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm font-bold text-[#25262a] transition-colors hover:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isSigningIn ? "Conectando ao Google…" : "Entrar com Google"}
            </button>

            {emailAuthEnabled && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-gray-600"><span className="h-px flex-1 bg-white/10" /><span>ou</span><span className="h-px flex-1 bg-white/10" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navigateToCredentialAuth("/entrar")} className="flex min-h-11 items-center justify-center rounded-xl border border-white/15 text-sm font-bold text-white transition-colors hover:border-brand-orange/50">Entrar com e-mail</button>
                  <button type="button" onClick={() => navigateToCredentialAuth("/cadastro")} className="flex min-h-11 items-center justify-center rounded-xl bg-brand-orange text-sm font-bold text-white transition-colors hover:bg-[#ff7526]">Criar conta</button>
                </div>
              </>
            )}
          </>
        )}

        {loginError && <p role="alert" className="mt-3 text-sm text-red-300">{loginError}</p>}

        <p className="mt-4 text-center text-xs leading-5 text-[#8f919a]">
          Ao entrar, você concorda com os{" "}
          <Link href="/termos" className="text-brand-orange underline underline-offset-4 hover:text-white">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand-orange underline underline-offset-4 hover:text-white">
            Política de Privacidade
          </Link>.
        </p>
      </div>
    </div>
  );

  if (mounted) {
    return createPortal(modalContent, document.body);
  }

  return null;
}
