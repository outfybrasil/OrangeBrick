"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isAdminUser } from "@/lib/auth";

export default function AdminSecurityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !isAdminUser(user)) {
          window.location.replace("/admin/login");
          return;
        }
        const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance.currentLevel === "aal2") {
          window.location.replace("/admin");
          return;
        }
        const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        if (active) setFactorId(data.totp.find((factor) => factor.status === "verified")?.id || null);
      } catch {
        if (active) setError("Não foi possível carregar a segurança da conta. Reabra esta página para tentar novamente.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [supabase]);

  async function enroll() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verified = factors.totp.find((factor) => factor.status === "verified");
      if (verified) { setFactorId(verified.id); return; }
      for (const factor of factors.all.filter((item) => item.factor_type === "totp" && item.status === "unverified")) {
        const { error: removalError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (removalError) throw removalError;
      }
      const { data, error: enrollmentError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Redação Orange Brick", issuer: "Orange Brick" });
      if (enrollmentError) throw enrollmentError;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code.startsWith("data:image/") ? data.totp.qr_code : `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`);
      setSecret(data.totp.secret);
    } catch {
      setError("Não foi possível configurar o autenticador. Tente novamente.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy || !factorId || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verificationError } = await supabase.auth.mfa.verify({ factorId, challengeId: data.id, code });
      if (verificationError) throw verificationError;
      setCode("");
      setSecret(null);
      setQrCode(null);
      window.location.replace("/admin");
    } catch {
      setError("Código inválido ou expirado. Use o código atual do seu aplicativo e tente novamente.");
    } finally { setBusy(false); }
  }

  return (
    <main id="conteudo-principal" className="flex min-h-dvh items-center justify-center bg-background-void px-4 py-10 text-white">
      <section aria-labelledby="security-title" className="w-full max-w-md rounded-xl border border-white/10 bg-card-slate p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Redação Orange Brick</p>
        <h1 id="security-title" className="mt-3 font-heading text-2xl font-black">Verificação em duas etapas</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">Para acessar o painel, confirme sua identidade com um aplicativo como Google Authenticator, Microsoft Authenticator ou Authy.</p>
        {loading ? <p role="status" className="mt-5 text-sm text-gray-400">Carregando…</p> : factorId ? (
          <form onSubmit={verify} className="mt-5 space-y-4">
            {qrCode && <div className="space-y-3"><p className="text-sm text-gray-300">Escaneie este QR code no seu aplicativo. Guarde o acesso ao autenticador em segurança.</p><img src={qrCode} alt="QR code para configurar o autenticador da sua conta" className="mx-auto h-52 w-52 bg-white p-2" /><p className="break-all text-xs text-gray-300">Chave para configuração manual: <code>{secret}</code></p></div>}
            <label htmlFor="mfa-code" className="block text-sm font-bold">Código de seis dígitos</label>
            <input id="mfa-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className="min-h-11 w-full rounded-lg border border-white/20 bg-background-void px-3 tracking-widest focus:border-brand-orange focus:outline-none" />
            <button type="submit" disabled={busy || code.length !== 6} className="min-h-11 w-full rounded-lg bg-brand-orange px-4 font-bold text-black disabled:opacity-50">{busy ? "Verificando…" : "Confirmar e acessar"}</button>
          </form>
        ) : <button type="button" onClick={() => void enroll()} disabled={busy} className="mt-5 min-h-11 w-full rounded-lg bg-brand-orange px-4 font-bold text-black disabled:opacity-50">{busy ? "Configurando…" : "Configurar autenticador"}</button>}
        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
        <Link href="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-gray-300 hover:text-white">Voltar ao site</Link>
      </section>
    </main>
  );
}
