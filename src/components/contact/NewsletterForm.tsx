"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [status, setStatus] = useState<{ type: "idle" | "sending" | "success" | "error"; message?: string }>({ type: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ type: "sending" });
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), website: formData.get("website") }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: "error", message: data.error || "Não foi possível registrar o e-mail." });
        return;
      }
      form.reset();
      setStatus({ type: "success", message: "Inscrição confirmada! Você receberá o resumo semanal." });
    } catch {
      setStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input type="text" name="website" value="" readOnly tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label htmlFor="newsletter-email" className="sr-only">Seu e-mail</label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        maxLength={254}
        placeholder="Seu melhor e-mail"
        className="h-11 min-w-0 flex-1 border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]"
      />
      <button type="submit" disabled={status.type === "sending"} className="min-h-11 border border-brand-orange bg-brand-orange px-5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#d94f00] disabled:cursor-not-allowed disabled:opacity-50">
        {status.type === "sending" ? "Assinando..." : "Assinar"}
      </button>
      {status.type === "success" && <p className="text-xs font-semibold text-emerald-400 sm:absolute sm:bottom-0">{status.message}</p>}
      {status.type === "error" && <p className="text-xs font-semibold text-red-400 sm:absolute sm:bottom-0">{status.message}</p>}
    </form>
  );
}