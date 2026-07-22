"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function isAdmin(user: import("@supabase/supabase-js").User | null): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === "orangebrick0@gmail.com" && user.app_metadata?.is_admin === true;
}

export default function AdminLogin() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isAdmin(user)) router.push("/admin");
      } catch {
      }
    }
    checkUser();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      const { data: { user } } = await supabase.auth.getUser();

      if (!isAdmin(user)) {
        await supabase.auth.signOut();
        throw new Error("Não autorizado: Este e-mail não possui privilégios de administrador.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao efetuar login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background-void px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,94,0,0.05),transparent_65%)] pointer-events-none" />

      <div className="w-full max-w-md bg-card-slate/85 border border-brand-orange-muted/15 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <img
            src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
            alt="Orange Brick Logo Icon"
            className="h-16 w-auto object-contain animate-pulse"
          />
          <h1 className="text-xl font-mono font-black text-white uppercase tracking-wider">
            Orange<span className="text-brand-orange">_</span>Brick <span className="text-brand-orange font-sans text-xs font-normal lowercase tracking-normal">/ admin</span>
          </h1>
          <p className="text-xs text-gray-400 font-sans">
            Faça login para gerenciar, editar e publicar notícias.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 font-mono text-sm">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
              E-mail do Administrador
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Orangebrick0@gmail.com"
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-4 py-2.5 outline-none focus:border-brand-orange/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-4 py-2.5 outline-none focus:border-brand-orange/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(255,94,0,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Acessando..." : "Entrar no Painel"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            ← Voltar para o site
          </button>
        </div>
      </div>
    </div>
  );
}
