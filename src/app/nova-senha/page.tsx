"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const router = useRouter();
  const supabase = createDataClient();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionState(data.session ? "valid" : "invalid"));
  }, [supabase.auth]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("O link expirou ou não foi possível alterar a senha. Solicite um novo.");
      return;
    }
    router.push("/entrar?senha=alterada");
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-void px-4 py-10 text-white">
      <section className="w-full max-w-md border border-white/10 bg-[#111217] p-5 sm:p-8">
        <p className="font-subtitle text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">Segurança da conta</p>
        <h1 className="mt-3 font-heading text-3xl font-black">Crie uma nova senha.</h1>
        {sessionState === "checking" ? (
          <div role="status" className="mt-7 flex min-h-20 items-center justify-center text-sm text-gray-400"><span className="mr-3 size-5 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />Validando o link...</div>
        ) : sessionState === "invalid" ? (
          <p className="mt-6 border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">Abra esta página pelo link recebido no e-mail. Se o link expirou, solicite uma nova recuperação.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-xs font-bold text-gray-300">Nova senha</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" />
            </div>
            <div>
              <label htmlFor="new-password-confirmation" className="mb-2 block text-xs font-bold text-gray-300">Repita a nova senha</label>
              <input id="new-password-confirmation" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-12 w-full border border-white/15 bg-[#0d0e12] px-4 text-base text-white outline-none focus:border-brand-orange focus-visible:ring-2 focus-visible:ring-brand-orange/30" />
            </div>
            {error && <p role="alert" className="border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={loading} className="min-h-12 w-full bg-brand-orange px-5 text-sm font-black text-white hover:bg-[#ff7526] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-55">{loading ? "Salvando..." : "Salvar nova senha"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
