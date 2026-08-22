"use client";

import { useState } from "react";

type ContactStatus = { type: "idle" | "sending" | "success" | "error"; message?: string };

export function ContactForm() {
  const [status, setStatus] = useState<ContactStatus>({ type: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ type: "sending" });
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: "error", message: data.error || "Não foi possível enviar a mensagem." });
        return;
      }
      form.reset();
      setStatus({ type: "success", message: "Mensagem enviada! Retornaremos em breve." });
    } catch {
      setStatus({ type: "error", message: "Erro de conexão. Tente novamente." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" name="website" value="" readOnly tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-300 uppercase tracking-wider">Nome</span>
          <input name="name" required maxLength={120} className="h-11 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]" placeholder="Seu nome" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-gray-300 uppercase tracking-wider">E-mail</span>
          <input name="email" type="email" required maxLength={254} className="h-11 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]" placeholder="voce@email.com" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-gray-300 uppercase tracking-wider">Assunto</span>
        <input name="subject" required maxLength={160} className="h-11 w-full border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]" placeholder="Sobre o que você quer falar?" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-gray-300 uppercase tracking-wider">Mensagem</span>
        <textarea name="message" required maxLength={5000} rows={6} className="w-full border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-brand-orange/40 focus:bg-white/[0.06]" placeholder="Escreva sua mensagem..." />
      </label>
      <button type="submit" disabled={status.type === "sending"} className="min-h-11 w-full border border-brand-orange bg-brand-orange px-4 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#d94f00] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
        {status.type === "sending" ? "Enviando..." : "Enviar mensagem"}
      </button>
      {status.type === "success" && <p className="text-sm font-semibold text-emerald-400">{status.message}</p>}
      {status.type === "error" && <p className="text-sm font-semibold text-red-400">{status.message}</p>}
    </form>
  );
}