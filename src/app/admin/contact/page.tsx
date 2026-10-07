"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import type { ContactSubmission } from "@/lib/types/database";

interface ContactCursor {
  createdAt: string;
  id: string;
}

export default function AdminContactPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<ContactCursor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Sua sessão expirou. Entre novamente no painel.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/contact", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json() as { submissions?: ContactSubmission[]; nextCursor?: ContactCursor | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os contatos.");
      setSubmissions(result.submissions || []);
      setNextCursor(result.nextCursor || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os contatos.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sua sessão expirou. Entre novamente no painel.");
      const params = new URLSearchParams({ createdAt: nextCursor.createdAt, id: nextCursor.id });
      const response = await fetch(`/api/admin/contact?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json() as { submissions?: ContactSubmission[]; nextCursor?: ContactCursor | null; error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os contatos.");
      setSubmissions((current) => {
        const knownIds = new Set(current.map((item) => item.id));
        return [...current, ...(result.submissions || []).filter((item) => !knownIds.has(item.id))];
      });
      setNextCursor(result.nextCursor || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os contatos.");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function setRead(submission: ContactSubmission, is_read: boolean) {
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sua sessão expirou. Entre novamente no painel.");
        return;
      }
      const response = await fetch("/api/admin/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: submission.id, is_read }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error || "Não foi possível atualizar o contato.");
        return;
      }
      setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, is_read } : item));
    } catch {
      setError("Não foi possível atualizar o contato. Verifique a conexão e tente novamente.");
    }
  }

  const unreadCount = submissions.filter((submission) => !submission.is_read).length;

  return (
    <AdminShell
      active="contact"
      title="Caixa de entrada"
      description="Mensagens enviadas pelo formulário de contato do site."
      status={<span className="text-xs text-gray-400">{unreadCount} não lida{unreadCount === 1 ? "" : "s"}</span>}
    >
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-400">{submissions.length} mensagens carregadas.</p>
          <button type="button" onClick={() => void load()} className="min-h-10 border border-white/15 px-3 text-xs font-bold text-white hover:bg-white/5">Atualizar</button>
        </div>
        {error && <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        {loading ? <p className="py-10 text-center text-sm text-gray-400">Carregando mensagens…</p> : submissions.length === 0 ? <p className="border border-white/10 bg-[#0e0f14] p-8 text-center text-sm text-gray-400">Nenhuma mensagem recebida.</p> : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <article key={submission.id} className={`border bg-[#0e0f14] p-4 sm:p-5 ${submission.is_read ? "border-white/10" : "border-brand-orange/40"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">{submission.subject || submission.company || "Geral"}</p>
                    <h2 className="mt-1 font-heading text-lg font-bold text-white">{submission.name}</h2>
                    <a href={`mailto:${submission.email}`} className="text-sm text-gray-300 underline decoration-white/25 underline-offset-2">{submission.email}</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <time className="text-xs text-gray-400">{new Date(submission.created_at).toLocaleString("pt-BR")}</time>
                    <button type="button" onClick={() => void setRead(submission, !submission.is_read)} className="min-h-10 border border-white/15 px-3 text-xs font-bold text-white hover:bg-white/5">
                      {submission.is_read ? "Marcar não lida" : "Marcar como lida"}
                    </button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">{submission.message}</p>
              </article>
            ))}
          </div>
        )}
        {!loading && submissions.length > 0 && nextCursor && (
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="min-h-10 w-full border border-white/15 px-3 text-xs font-bold text-white hover:bg-white/5 disabled:cursor-wait disabled:opacity-60">
            {loadingMore ? "Carregando mensagens…" : "Carregar mensagens anteriores"}
          </button>
        )}
      </section>
    </AdminShell>
  );
}
