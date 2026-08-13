"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";

interface CredentialAuthFormProps {
  mode: "login" | "signup";
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalized.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (normalized.includes("user already registered")) return "Este e-mail já possui uma conta.";
  if (normalized.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (normalized.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return "Não foi possível concluir o acesso. Tente novamente.";
}

export function CredentialAuthForm({ mode }: CredentialAuthFormProps) {
  const router = useRouter();
  const supabase = createDataClient();
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"email" | "password" | "confirmation" | "eligibility" | "form" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (!isSignup && new URLSearchParams(window.location.search).get("senha") === "alterada") setMessage("Senha alterada. Entre novamente com sua nova senha.");
  }, [isSignup]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrorField(null);
    setMessage(null);
    if (!eligibilityConfirmed) {
      setError("Confirme a condição de participação para continuar.");
      setErrorField("eligibility");
      return;
    }
    if (isSignup && password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      setErrorField("confirmation");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      setErrorField("password");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile/setup` },
        });
        if (signUpError) throw signUpError;
        if (data.session) router.push("/profile/setup");
        else setMessage("Conta criada. Abra o e-mail de confirmação para ativar seu acesso.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
        router.push("/brickboard");
        router.refresh();
      }
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : ""));
      setErrorField("form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[30rem] border border-white/10 bg-[#111217] p-5 sm:p-8">
      <div className="mb-7 flex items-center gap-3">
        <span className="h-px w-8 bg-brand-orange" />
        <span className="font-subtitle text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">Conta Orange Brick</span>
      </div>
      <h1 className="max-w-md text-balance font-heading text-3xl font-black leading-tight text-white sm:text-4xl">
        {isSignup ? "Entre para a conversa." : "Volte para o Brickboard."}
      </h1>
      <p className="mt-3 max-w-[55ch] text-sm leading-6 text-gray-400">
        {isSignup ? "Crie sua conta com e-mail e escolha depois como será conhecido pela comunidade." : "Acesse comentários, reações, enquetes e seu perfil."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor={`${mode}-email`} className="mb-2 block text-xs font-bold text-gray-300">E-mail</label>
          <input id={`${mode}-email`} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={errorField === "email" || errorField === "form"} aria-describedby={error && (errorField === "email" || errorField === "form") ? `${mode}-auth-error` : undefined} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" placeholder="voce@exemplo.com" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor={`${mode}-password`} className="text-xs font-bold text-gray-300">Senha</label>
            {!isSignup && <Link href="/recuperar-senha" className="text-xs font-bold text-brand-orange hover:text-white">Esqueci minha senha</Link>}
          </div>
          <input id={`${mode}-password`} type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={errorField === "password" || errorField === "form"} aria-describedby={error && (errorField === "password" || errorField === "form") ? `${mode}-auth-error` : undefined} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" placeholder="Mínimo de 8 caracteres" />
        </div>
        {isSignup && (
          <div>
            <label htmlFor="signup-password-confirmation" className="mb-2 block text-xs font-bold text-gray-300">Repita a senha</label>
            <input id="signup-password-confirmation" type="password" autoComplete="new-password" required minLength={8} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} aria-invalid={errorField === "confirmation"} aria-describedby={error && errorField === "confirmation" ? `${mode}-auth-error` : undefined} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" placeholder="Digite a mesma senha" />
          </div>
        )}
        <label className="flex min-h-12 cursor-pointer items-start gap-3 border border-white/10 bg-black/20 p-3 text-xs leading-5 text-gray-300">
          <input type="checkbox" checked={eligibilityConfirmed} onChange={(event) => setEligibilityConfirmed(event.target.checked)} aria-invalid={errorField === "eligibility"} aria-describedby={error && errorField === "eligibility" ? `${mode}-auth-error` : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff5e00]" />
          <span>Confirmo que tenho 18 anos ou participo com autorização e acompanhamento do meu responsável.</span>
        </label>
        {error && <p id={`${mode}-auth-error`} role="alert" className="border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200">{message}</p>}
        <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center bg-brand-orange px-5 text-sm font-black text-white transition-colors hover:bg-[#ff7526] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-55">
          {loading ? "Processando..." : isSignup ? "Criar minha conta" : "Entrar com e-mail"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-gray-600"><span className="h-px flex-1 bg-white/10" /><span>ou</span><span className="h-px flex-1 bg-white/10" /></div>
      <button type="button" disabled={!eligibilityConfirmed || loading} onClick={() => signInWithGoogle()} className="flex min-h-12 w-full items-center justify-center border border-white/20 bg-white px-4 text-sm font-bold text-[#202126] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45">Continuar com Google</button>
      <p className="mt-6 text-center text-sm text-gray-400">
        {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
        <Link href={isSignup ? "/entrar" : "/cadastro"} className="font-bold text-brand-orange hover:text-white">{isSignup ? "Entrar" : "Criar conta"}</Link>
      </p>
      <p className="mt-5 text-center text-xs leading-5 text-gray-500">Ao continuar, você concorda com os <Link href="/termos" className="text-gray-300 hover:text-white">Termos de Uso</Link> e a <Link href="/privacidade" className="text-gray-300 hover:text-white">Política de Privacidade</Link>.</p>
    </div>
  );
}
