"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function AdminLogin() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isAdminUser(user)) router.push("/admin");
      } catch {
      }
    }

    void checkUser();
  }, [router, supabase]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!isAdminUser(user)) {
        await supabase.auth.signOut();
        throw new Error("Esta conta não tem permissão para acessar a redação.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar. Verifique os dados e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh bg-background-void text-white lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.07] bg-[#15161d] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-brand-orange/10 blur-3xl" />
        <Link href="/" className="relative flex w-fit items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-orange">
          <img
            src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
            alt=""
            style={{ maxHeight: "40px", maxWidth: "56px", width: "auto", height: "auto" }}
            className="h-10 w-auto max-w-14 object-contain"
          />
          <span className="font-heading text-xl font-black uppercase">
            Orange<span className="text-brand-orange">_</span>Brick
          </span>
        </Link>

        <div className="relative max-w-lg">
          <p className="mb-4 text-sm font-bold text-brand-orange">Redação Orange Brick</p>
          <h1 className="text-balance font-heading text-5xl font-black leading-[0.98] tracking-[-0.04em]">
            Da pauta ao ar, sem perder o controle.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-gray-400">
            Gerencie rascunhos, revise pendências e publique cada matéria em um ambiente feito para o fluxo editorial.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs font-semibold text-gray-500">
          <LockIcon />
          Acesso restrito à equipe autorizada
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-3 py-8 sm:px-6 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex min-h-11 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-orange">
              <img
                src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
                alt="Orange Brick"
                style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
                className="h-9 w-auto max-w-12 object-contain"
              />
              <span className="font-heading text-base font-black uppercase">
                Orange<span className="text-brand-orange">_</span>Brick
              </span>
            </Link>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-gray-400">Admin</span>
          </div>

          <div className="rounded-2xl bg-[#15161d] p-5 sm:p-8">
            <div>
              <p className="text-sm font-bold text-brand-orange">Acesso administrativo</p>
              <h1 className="mt-2 font-heading text-3xl font-black tracking-[-0.03em]">Entrar na redação</h1>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Use a conta administrativa cadastrada para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              {error && (
                <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm leading-6 text-red-200">
                  {error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-gray-300">E-mail</span>
                <input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="nome@dominio.com"
                  className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-background-void px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/25"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-gray-300">Senha</span>
                <span className="relative block">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Digite sua senha"
                    className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-background-void px-4 pr-20 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-3 text-xs font-bold text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-[#ff7122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-60"
              >
                {isLoading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {isLoading ? "Verificando acesso..." : "Entrar no painel"}
              </button>
            </form>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 px-1 text-xs text-gray-600">
            <Link href="/" className="min-h-11 rounded-xl py-3 font-semibold transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange">
              Voltar ao site
            </Link>
            <span className="flex items-center gap-1.5">
              <LockIcon />
              Sessão protegida
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
