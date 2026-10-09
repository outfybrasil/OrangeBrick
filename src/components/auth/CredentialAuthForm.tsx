"use client";

import { Suspense, useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { safeReturnTo } from "@/lib/auth/return-to";
import { PLATFORMS_CONFIG, PLATFORM_SLUGS, type PlatformSlug } from "@/lib/types/platform";

interface CredentialAuthFormProps {
  mode: "login" | "signup";
}

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Enviamos um link de ativação para a sua caixa de entrada.";
  if (normalized.includes("user already registered")) return "Este e-mail já possui uma conta no portal. Tente fazer login ou recupere sua senha.";
  if (normalized.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) return "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.";
  if (normalized.includes("signup disabled")) return "O cadastro de novas contas está temporariamente indisponível.";
  if (normalized.includes("confirmation email") || normalized.includes("sending confirmation")) {
    return "Erro no envio do e-mail de ativação pelo Resend. Verifique um domínio próprio no Resend ou desative temporariamente a opção 'Confirm email' no painel do Supabase para liberar cadastros.";
  }
  return "Não foi possível concluir a autenticação. Verifique as informações e tente novamente.";
}

function sanitizeUsername(val: string): string {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let points = 0;
  if (pwd.length >= 8) points += 1;
  if (pwd.length >= 12) points += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) points += 1;
  if (/[0-9]/.test(pwd)) points += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) points += 1;

  if (points <= 1) return { score: 1, label: "Fraca", color: "bg-red-500" };
  if (points === 2) return { score: 2, label: "Razoável", color: "bg-amber-500" };
  if (points === 3) return { score: 3, label: "Boa", color: "bg-yellow-400" };
  if (points >= 4) return { score: 4, label: "Forte", color: "bg-emerald-500" };
  return { score: 4, label: "Excelente", color: "bg-emerald-400" };
}

function CredentialAuthFormInner({ mode }: CredentialAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createDataClient(), []);
  const { signInWithGoogle, savedAccounts, switchAccount, removeAccount } = useAuth();
  const isSignup = mode === "signup";
  const returnTo = safeReturnTo(searchParams.get("next"), "/brickboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);

  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | "confirmation" | "nickname" | "username" | "eligibility" | "form" | null>(null);
  const [message, setMessage] = useState<string | null>(() => {
    if (!isSignup && searchParams.get("senha") === "alterada") {
      return "Senha alterada com sucesso! Entre agora com sua nova senha.";
    }
    return null;
  });

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = Boolean(password && passwordConfirmation && password === passwordConfirmation);

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (!usernameTouched) {
      const candidate = sanitizeUsername(val);
      setUsername(candidate);
    }
  };

  const handleUsernameChange = (val: string) => {
    setUsernameTouched(true);
    setUsername(sanitizeUsername(val));
  };

  const togglePlatform = (slug: PlatformSlug) => {
    setSelectedPlatforms((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug]
    );
  };

  const handleQuickSwitch = async (accountUserId: string) => {
    setSwitchingUserId(accountUserId);
    setError(null);
    try {
      const ok = await switchAccount(accountUserId);
      if (ok) {
        router.push(returnTo);
      } else {
        setError("A sessão desta conta expirou. Digite sua senha para entrar novamente.");
      }
    } catch {
      setError("Não foi possível acessar a conta salva. Tente novamente.");
    } finally {
      setSwitchingUserId(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setErrorField(null);
    try {
      await signInWithGoogle(returnTo);
    } catch {
      setError("Não foi possível conectar com o Google. Tente novamente.");
      setErrorField("form");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = submittedEmail || email.trim().toLowerCase();
    if (!targetEmail || resendLoading) return;
    setResendLoading(true);
    setError(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/brickboard`,
        },
      });
      if (resendError) throw resendError;
      setResendSuccess(true);
    } catch {
      setError("Não foi possível reenviar o e-mail no momento. Aguarde alguns instantes.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrorField(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError("Por favor, informe um endereço de e-mail válido.");
      setErrorField("email");
      return;
    }

    if (!eligibilityConfirmed) {
      setError("Você precisa confirmar os termos e a idade para continuar.");
      setErrorField("eligibility");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve conter no mínimo 8 caracteres.");
      setErrorField("password");
      return;
    }

    if (isSignup) {
      const trimmedNickname = nickname.trim();
      if (trimmedNickname.length < 2 || trimmedNickname.length > 30) {
        setError("O apelido deve ter entre 2 e 30 caracteres.");
        setErrorField("nickname");
        return;
      }

      const normalizedUsername = sanitizeUsername(username || trimmedNickname);
      if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
        setError("O nome de usuário deve ter entre 3 e 30 caracteres alfanuméricos.");
        setErrorField("username");
        return;
      }

      if (password !== passwordConfirmation) {
        setError("As senhas digitadas não coincidem.");
        setErrorField("confirmation");
        return;
      }

      setLoading(true);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: trimmedNickname,
              full_name: trimmedNickname,
              user_name: normalizedUsername,
              favorite_platforms: selectedPlatforms,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/brickboard&returnTo=${encodeURIComponent(returnTo)}`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session && data.user) {
          try {
            await supabase.from("profiles").upsert({
              user_id: data.user.id,
              nickname: trimmedNickname,
              display_name: trimmedNickname,
              username: normalizedUsername,
              favorite_platforms: selectedPlatforms,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          } catch {
          }
          router.push(returnTo);
          router.refresh();
          return;
        }

        setSubmittedEmail(cleanEmail);
      } catch (caught) {
        setError(authErrorMessage(caught instanceof Error ? caught.message : ""));
        setErrorField("form");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) throw signInError;

      router.push(returnTo);
      router.refresh();
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : ""));
      setErrorField("form");
    } finally {
      setLoading(false);
    }
  };

  if (isSignup && submittedEmail) {
    return (
      <div className="mx-auto w-full max-w-[32rem] border border-brand-orange/30 bg-[#111217] p-6 shadow-2xl sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-orange/40 bg-brand-orange/10 text-brand-orange">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="mt-6">
          <span className="font-subtitle text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
            Quase lá!
          </span>
          <h1 className="mt-2 font-heading text-3xl font-black text-white sm:text-4xl">
            Confirme seu e-mail
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-300">
            Enviamos um link de ativação para o endereço abaixo:
          </p>
          <div className="mt-3 inline-block rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-sm font-bold text-brand-orange">
            {submittedEmail}
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-400">
            Abra sua caixa de entrada (ou pasta de spam/lixo eletrônico) e clique no link para ativar seu cadastro e desbloquear votos, comentários e o Brickboard.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/10"
          >
            <span>Abrir Gmail</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <a
            href="https://outlook.live.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-white transition-colors hover:border-brand-orange/40 hover:bg-white/10"
          >
            <span>Abrir Outlook</span>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {error && (
          <p role="alert" className="mt-5 border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </p>
        )}

        {resendSuccess && (
          <p role="status" className="mt-5 border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            Novo e-mail enviado! Verifique sua caixa de entrada nos próximos minutos.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 pt-6 border-t border-white/10">
          <button
            type="button"
            disabled={resendLoading}
            onClick={handleResendConfirmation}
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-brand-orange/30 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange/10 disabled:opacity-50"
          >
            {resendLoading ? "Reenviando e-mail..." : "Não recebeu? Reenviar link de confirmação"}
          </button>
          <Link
            href="/entrar"
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-white/5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Ir para a tela de login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[32rem] border border-white/10 bg-[#111217] p-6 shadow-2xl sm:p-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-px w-8 bg-brand-orange" />
        <span className="font-subtitle text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">
          {isSignup ? "Cadastro Orange Brick" : "Acesso Orange Brick"}
        </span>
      </div>

      <h1 className="max-w-md text-balance font-heading text-3xl font-black leading-tight text-white sm:text-4xl">
        {isSignup ? "Crie sua conta completa" : "Entre na sua conta"}
      </h1>
      <p className="mt-2.5 max-w-[55ch] text-sm leading-6 text-gray-400">
        {isSignup
          ? "Cadastre-se para comentar, votar em lançamentos e acumular XP na comunidade."
          : "Acesse discussões, votos no radar, matérias salvas e seu perfil no Brickboard."}
      </p>

      {!isSignup && savedAccounts.length > 0 && (
        <div className="mt-6 border border-brand-orange/20 bg-brand-orange/5 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
              Contas conectadas neste dispositivo
            </span>
            <span className="text-[10px] text-gray-400">
              Clique para acessar
            </span>
          </div>

          <div className="space-y-2">
            {savedAccounts.map((account) => {
              const isSwitching = switchingUserId === account.userId;
              return (
                <div
                  key={account.userId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#16181f] p-2.5 transition-colors hover:border-brand-orange/40"
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

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={Boolean(switchingUserId)}
                      onClick={() => handleQuickSwitch(account.userId)}
                      className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-[#ff7526] transition-colors"
                    >
                      {isSwitching ? "Entrando..." : "Acessar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAccount(account.userId)}
                      title="Remover deste dispositivo"
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleGoogleLogin()}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 text-sm font-bold text-[#202126] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>{loading ? "Conectando ao Google…" : isSignup ? "Cadastrar com Google" : "Continuar com Google"}</span>
        </button>
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Ao continuar com Google, você concorda com os{" "}
          <Link href="/termos" className="text-gray-400 underline underline-offset-2 hover:text-white">
            Termos
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-gray-400 underline underline-offset-2 hover:text-white">
            Privacidade
          </Link>.
        </p>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-white/10" />
        <span>ou preencha com e-mail e senha</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signup-nickname" className="mb-1.5 block text-xs font-bold text-gray-300">
                Apelido / Nome de exibição
              </label>
              <input
                id="signup-nickname"
                type="text"
                required
                maxLength={30}
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                aria-invalid={errorField === "nickname"}
                placeholder="Ex: Alex Silva"
                className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d0e12] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange"
              />
              <p className="mt-1 text-[11px] text-gray-500">Nome visível em comentários.</p>
            </div>

            <div>
              <label htmlFor="signup-username" className="mb-1.5 block text-xs font-bold text-gray-300">
                Nome de usuário (@user)
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 text-sm font-bold text-gray-500">@</span>
                <input
                  id="signup-username"
                  type="text"
                  required
                  maxLength={30}
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  aria-invalid={errorField === "username"}
                  placeholder="alex-gamer"
                  className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d0e12] pl-8 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange font-mono"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Identificador único no portal.</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`${mode}-email`} className="mb-1.5 block text-xs font-bold text-gray-300">
            E-mail
          </label>
          <input
            id={`${mode}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errorField === "email" || errorField === "form"}
            placeholder="voce@exemplo.com"
            className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d0e12] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <label htmlFor={`${mode}-password`} className="text-xs font-bold text-gray-300">
              Senha
            </label>
            {!isSignup && (
              <Link href="/recuperar-senha" className="text-xs font-bold text-brand-orange hover:text-white">
                Esqueceu a senha?
              </Link>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              id={`${mode}-password`}
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errorField === "password" || errorField === "form"}
              placeholder="Mínimo de 8 caracteres"
              className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d0e12] pl-3.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
              className="absolute right-3 p-1 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {isSignup && password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Força da senha:</span>
                <span className="font-bold text-gray-300">{passwordStrength.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`rounded-full transition-colors ${
                      passwordStrength.score >= step ? passwordStrength.color : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isSignup && (
          <div>
            <label htmlFor="signup-password-confirmation" className="mb-1.5 block text-xs font-bold text-gray-300">
              Confirme a senha
            </label>
            <div className="relative flex items-center">
              <input
                id="signup-password-confirmation"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                aria-invalid={errorField === "confirmation"}
                placeholder="Repita sua senha"
                className="min-h-11 w-full rounded-xl border border-white/15 bg-[#0d0e12] pl-3.5 pr-10 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-1 focus-visible:ring-brand-orange"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Ver confirmação de senha"}
                className="absolute right-3 p-1 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passwordConfirmation.length > 0 && (
              <p className={`mt-1 text-[11px] font-bold ${passwordsMatch ? "text-emerald-400" : "text-amber-400"}`}>
                {passwordsMatch ? "✓ As senhas coincidem" : "As senhas ainda não coincidem"}
              </p>
            )}
          </div>
        )}

        {isSignup && (
          <div className="pt-2">
            <label className="mb-2 block text-xs font-bold text-gray-300">
              O que você mais joga? (Opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_SLUGS.map((slug) => {
                const config = PLATFORMS_CONFIG[slug];
                const isSelected = selectedPlatforms.includes(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => togglePlatform(slug)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-brand-orange bg-brand-orange text-white shadow-[0_0_15px_rgba(255,94,0,0.3)]"
                        : "border-white/15 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    {config.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2">
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-gray-300">
            <input
              type="checkbox"
              checked={eligibilityConfirmed}
              onChange={(e) => setEligibilityConfirmed(e.target.checked)}
              aria-invalid={errorField === "eligibility"}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff5e00]"
            />
            <span>
              Confirmo que tenho 18 anos ou participo com autorização e acompanhamento dos meus responsáveis, e concordo com os{" "}
              <Link href="/termos" className="text-brand-orange underline underline-offset-2 hover:text-white">
                Termos
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" className="text-brand-orange underline underline-offset-2 hover:text-white">
                Privacidade
              </Link>.
            </span>
          </label>
        </div>

        {!isSignup && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="h-4 w-4 rounded accent-[#ff5e00]"
              />
              <span>Manter conectado neste dispositivo</span>
            </label>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
            <svg className="h-4 w-4 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <span>{error}</span>
              {error.toLowerCase().includes("confirme seu e-mail") && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="mt-2 block font-bold text-brand-orange underline underline-offset-2 hover:text-white"
                >
                  {resendLoading ? "Reenviando..." : "Reenviar e-mail de ativação agora"}
                </button>
              )}
            </div>
          </div>
        )}

        {message && (
          <div role="status" className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-orange px-5 text-sm font-black text-white transition-all hover:bg-[#ff7526] hover:shadow-[0_0_20px_rgba(255,94,0,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-55"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>{isSignup ? "Criando sua conta..." : "Entrando..."}</span>
            </div>
          ) : (
            <span>{isSignup ? "Criar minha conta gratuita" : "Entrar na minha conta"}</span>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-gray-400">
        {isSignup ? "Já tem uma conta no Orange Brick?" : "Ainda não tem conta no Orange Brick?"}{" "}
        <Link
          href={isSignup ? "/entrar" : "/cadastro"}
          className="font-bold text-brand-orange hover:text-white underline underline-offset-4"
        >
          {isSignup ? "Entrar" : "Cadastre-se gratuitamente"}
        </Link>
      </p>
    </div>
  );
}

export function CredentialAuthForm(props: CredentialAuthFormProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[32rem] min-h-[480px] rounded-2xl border border-white/10 bg-[#111217] p-8 animate-pulse" />
      }
    >
      <CredentialAuthFormInner {...props} />
    </Suspense>
  );
}

