"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { DeliveryStatus } from "@/lib/publication-status";

type Publication = { id: string; title: string; slug: string; site: "published" | "scheduled" | "draft"; publishedAt: string | null; telegram: DeliveryStatus; youtube: DeliveryStatus; instagram: DeliveryStatus; tiktok: DeliveryStatus };
type Report = { items: Publication[]; page: number; pages: number; warnings: string[]; checkedAt: string };

function Delivery({ status }: { status: DeliveryStatus }) {
  const color = status.state === "received" ? "text-emerald-300" : ["failed", "unknown"].includes(status.state) ? "text-amber-300" : "text-gray-300";
  return <><p className={`text-sm font-bold ${color}`}>{status.label}</p><p className="mt-1 text-xs leading-5 text-gray-400">{status.detail}</p>{status.updatedAt && <p className="mt-2 text-xs text-gray-500">{new Date(status.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}</>;
}

export default function PublicationsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Publication | null>(null);
  const dialogRef = useModalDialog<HTMLElement>(Boolean(candidate), () => { if (!retrying) setCandidate(null); });
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Entre novamente no ADM para consultar as publicações.");
      const response = await fetch(`/api/admin/publications?page=${page}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível consultar as publicações.");
      if (!signal?.aborted) setData(result);
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar o acompanhamento."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal); });
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(controller.signal); }, 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [load]);
  async function retry(post: Publication) {
    if (retrying) return;
    setRetrying(post.id);
    setMessage("");
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Sua sessão expirou.");
      const response = await fetch("/api/admin/publications", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ postId: post.id, destination: "telegram", confirmed: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível confirmar a nova tentativa.");
      setMessage(result.message);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Não foi possível confirmar o envio."); }
    finally { setCandidate(null); await load(); setRetrying(null); }
  }
  return <AdminShell active="publications" title="Acompanhamento das publicações" description="Confira cada destino e retome apenas os envios com falha confirmada.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-xs leading-5 text-gray-400">O Telegram acompanha o aviso enviado ao administrador. O YouTube mostra o último envio registrado por matéria; privado e não listado não significam publicação pública. Horários de Brasília.</p><button onClick={() => void load()} disabled={loading || Boolean(retrying)} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm disabled:opacity-50">Atualizar</button></div>
    {error && <p role="alert" className="mb-4 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-xl border border-brand-orange/30 p-4 text-sm text-gray-200">{message}</p>}
    {loading && <p role="status" className="mb-4 text-sm text-gray-400">Atualizando acompanhamento…</p>}
    {data && <>{data.warnings.map(warning => <p key={warning} role="alert" className="mb-3 text-sm text-amber-300">{warning}</p>)}<div className="space-y-4">{data.items.length === 0 && <p className="py-8 text-gray-400">Nenhuma matéria encontrada.</p>}{data.items.map(post => <article key={post.id} className="min-w-0 rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-5"><h2 className="break-words font-heading text-base font-bold">{post.title}</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <section aria-label={`Site: ${post.title}`} className="rounded-lg border border-white/10 p-3"><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Site</h3><p className={`text-sm font-bold ${post.site === "published" ? "text-emerald-300" : "text-gray-300"}`}>{{ published: "Publicado", scheduled: "Agendado", draft: "Rascunho" }[post.site]}</p>{post.publishedAt && post.site === "published" && <p className="mt-2 text-xs text-gray-500">{new Date(post.publishedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>}<Link href={post.site === "published" ? `/posts/${post.slug}` : `/admin/edit?id=${post.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-brand-orange">{post.site === "published" ? "Abrir matéria →" : "Revisar matéria →"}</Link></section>
      <section aria-label={`Telegram: ${post.title}`} className="rounded-lg border border-white/10 p-3"><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Telegram · aviso ADM</h3><Delivery status={post.telegram} />{post.site === "published" && post.telegram.canRetry && <button type="button" disabled={loading || Boolean(retrying)} onClick={() => setCandidate(post)} className="mt-2 min-h-11 text-xs font-bold text-brand-orange disabled:opacity-50">Tentar novamente só no Telegram</button>}</section>
      <section aria-label={`YouTube: ${post.title}`} className="rounded-lg border border-white/10 p-3"><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">YouTube</h3><Delivery status={post.youtube} />{post.youtube.url && <a href={post.youtube.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-brand-orange">Abrir vídeo →</a>}{post.youtube.canRetry && <Link href={`/admin/reels?postId=${post.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-brand-orange">Revisar e tentar novamente só no YouTube →</Link>}{post.youtube.state === "unknown" && <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-brand-orange">Conferir no YouTube Studio →</a>}</section>
      <section aria-label={`Instagram: ${post.title}`} className="rounded-lg border border-white/10 p-3"><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Instagram</h3><Delivery status={post.instagram} /></section>
      <section aria-label={`TikTok: ${post.title}`} className="rounded-lg border border-white/10 p-3"><h3 className="mb-2 text-xs font-bold uppercase text-gray-500">TikTok</h3><Delivery status={post.tiktok} /></section>
    </div></article>)}</div><div className="mt-6 flex flex-wrap items-center justify-between gap-3"><button disabled={page === 1 || loading || Boolean(retrying)} onClick={() => { setData(null); setPage(value => value - 1); }} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm disabled:opacity-40">Anterior</button><p className="text-xs text-gray-400">Página {data.page} de {data.pages}</p><button disabled={page >= data.pages || loading || Boolean(retrying)} onClick={() => { setData(null); setPage(value => value + 1); }} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm disabled:opacity-40">Próxima</button></div><p className="mt-4 text-xs text-gray-500">Última consulta: {new Date(data.checkedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Atualização automática a cada 30 segundos enquanto a página estiver visível.</p></>}
    {candidate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="publication-retry-title" className="w-full max-w-lg rounded-xl border border-amber-400/30 bg-[#0e0f14] p-5"><p id="publication-retry-title" className="text-sm font-bold">Tentar enviar novamente o aviso de “{candidate.title}” ao administrador no Telegram?</p><p className="mt-2 text-xs leading-5 text-gray-300">A matéria no site e o envio ao YouTube não serão repetidos.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={Boolean(retrying)} onClick={() => void retry(candidate)} className="min-h-11 rounded-lg bg-brand-orange px-4 text-sm font-bold text-black disabled:opacity-50">{retrying ? "Enviando aviso…" : "Confirmar nova tentativa"}</button><button disabled={Boolean(retrying)} onClick={() => setCandidate(null)} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm disabled:opacity-50">Cancelar</button></div></section></div>}
  </AdminShell>;
}
