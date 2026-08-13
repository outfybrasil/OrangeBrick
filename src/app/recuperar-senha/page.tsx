"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";

export default function PasswordRecoveryPage() {
  const supabase = createDataClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/callback?next=/nova-senha` });
    setLoading(false);
    if (resetError) {
      setError("Não foi possível enviar o e-mail agora. Aguarde e tente novamente.");
      return;
    }
    setSent(true);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-void px-4 py-10 text-white">
      <section className="w-full max-w-md border border-white/10 bg-[#111217] p-5 sm:p-8">
        <Link href="/entrar" className="inline-flex min-h-11 items-center text-sm font-bold text-gray-400 hover:text-white">← Voltar ao acesso</Link>
        <p className="mt-5 font-subtitle text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">Recuperar acesso</p>
        <h1 className="mt-3 font-heading text-3xl font-black text-white">Redefina sua senha.</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">Enviaremos um link seguro caso exista uma conta vinculada ao endereço informado.</p>
        {sent ? (
          <div role="status" className="mt-7 border border-emerald-500/35 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">Confira sua caixa de entrada e também a pasta de spam. O link tem duração limitada.</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="recovery-email" className="mb-2 block text-xs font-bold text-gray-300">E-mail da conta</label>
              <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" placeholder="voce@exemplo.com" />
            </div>
            {error && <p role="alert" className="border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="min-h-12 w-full bg-brand-orange px-5 text-sm font-black text-white hover:bg-[#ff7526] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-55">{loading ? "Enviando..." : "Enviar link de recuperação"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
