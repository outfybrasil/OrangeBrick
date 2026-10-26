"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { DeliveryStatus } from "@/lib/publication-status";

type PublicationSite = "published" | "scheduled" | "draft";
type PublicationFilter = "all" | PublicationSite;
type Publication = { id: string; title: string; slug: string; site: PublicationSite; publishedAt: string | null; telegram: DeliveryStatus; youtube: DeliveryStatus; instagram: DeliveryStatus; tiktok: DeliveryStatus };
type Report = { items: Publication[]; page: number; pages: number; pageSize: number; total: number; warnings: string[]; checkedAt: string };

const FILTERS: Array<{ value: PublicationFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "scheduled", label: "Agendadas" },
  { value: "draft", label: "Rascunhos" },
];

const siteLabels: Record<PublicationSite, string> = { published: "Publicada", scheduled: "Agendada", draft: "Rascunho" };

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function statusColor(status: DeliveryStatus) {
  if (status.state === "received") return "text-emerald-300";
  if (["failed", "unknown"].includes(status.state)) return "text-amber-300";
  return "text-gray-300";
}

function StatusPill({ label, status }: { label: string; status: DeliveryStatus }) {
  const dotColor = status.state === "received" ? "bg-emerald-300" : ["failed", "unknown"].includes(status.state) ? "bg-amber-300" : "bg-gray-500";
  return (
    <span title={`${label}: ${status.label}`} className="inline-flex min-h-8 items-center gap-2 border border-white/10 px-2.5 text-xs text-gray-300">
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dotColor}`} />
      <span className="text-gray-500">{label}</span>
      <span className={`max-w-32 truncate font-semibold ${statusColor(status)}`}>{status.label}</span>
    </span>
  );
}

function SitePill({ site }: { site: PublicationSite }) {
  const color = site === "published" ? "border-emerald-400/25 text-emerald-300" : site === "scheduled" ? "border-sky-300/25 text-sky-200" : "border-white/15 text-gray-300";
  return <span className={`inline-flex min-h-8 items-center border px-2.5 text-xs font-semibold ${color}`}>{siteLabels[site]}</span>;
}

function Delivery({ status }: { status: DeliveryStatus }) {
  return (
    <>
      <p className={`text-sm font-bold ${statusColor(status)}`}>{status.label}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{status.detail}</p>
      {status.updatedAt && <p className="mt-2 text-xs text-gray-500">Atualizado {formatDate(status.updatedAt)}</p>}
    </>
  );
}

function Pagination({ page, pages, pageSize, total, loading, onPageChange, label }: {
  page: number;
  pages: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (nextPage: number) => void;
  label: string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-3">
      <p className="text-xs text-gray-400">Exibindo {first}–{last} de {total.toLocaleString("pt-BR")} matérias</p>
      <nav aria-label={label} className="flex items-center gap-2">
        <button type="button" disabled={page === 1 || loading} onClick={() => onPageChange(page - 1)} className="min-h-10 border border-white/15 px-3 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
        <span aria-live="polite" className="min-w-24 text-center text-xs text-gray-400">Página {page} de {pages}</span>
        <button type="button" disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)} className="min-h-10 border border-white/15 px-3 text-xs font-semibold text-gray-200 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
      </nav>
    </div>
  );
}

export default function PublicationsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState<PublicationFilter>("all");
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
      const query = new URLSearchParams({ page: String(page), site: siteFilter });
      const response = await fetch(`/api/admin/publications?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível consultar as publicações.");
      if (!signal?.aborted) setData(result);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar o acompanhamento.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, siteFilter]);

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
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível confirmar o envio.");
    } finally {
      setCandidate(null);
      await load();
      setRetrying(null);
    }
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
  }

  return (
    <AdminShell active="publications" title="Acompanhamento das publicações" description="Veja o estado de cada matéria e abra os detalhes apenas quando precisar agir.">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-xs leading-5 text-gray-400">O Telegram acompanha o aviso enviado ao administrador. O YouTube mostra o último envio registrado; vídeos privados ou não listados não são públicos. Horários de Brasília.</p>
        <div className="flex items-center gap-3">
          {loading && data && <span role="status" className="text-xs text-gray-500">Atualizando…</span>}
          <button type="button" onClick={() => void load()} disabled={loading || Boolean(retrying)} className="min-h-11 border border-white/20 px-4 text-sm font-semibold transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-50">Atualizar</button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 border border-red-400/25 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mb-4 border border-brand-orange/30 p-4 text-sm text-gray-200">{message}</p>}

      {data && (
        <>
          {data.warnings.length > 0 && <div className="mb-4 space-y-2">{data.warnings.map(warning => <p key={warning} role="alert" className="border border-amber-400/25 p-3 text-sm text-amber-200">{warning}</p>)}</div>}

          <section aria-label="Lista de publicações">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-bold text-white">Matérias</h2>
                <p className="mt-1 text-xs text-gray-500">Abra uma linha para ver os detalhes dos envios.</p>
              </div>
              <div role="group" aria-label="Filtrar matérias por status no site" className="flex flex-wrap gap-1 border-b border-white/10">
                {FILTERS.map(filter => (
                  <button key={filter.value} type="button" aria-pressed={siteFilter === filter.value} onClick={() => { if (siteFilter === filter.value) return; setData(null); setPage(1); setSiteFilter(filter.value); }} className={`min-h-10 border-b-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange ${siteFilter === filter.value ? "border-brand-orange text-white" : "border-transparent text-gray-400 hover:text-gray-200"}`}>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {data && <Pagination page={data.page} pages={data.pages} pageSize={data.pageSize} total={data.total} loading={loading || Boolean(retrying)} onPageChange={changePage} label="Paginação superior das matérias" />}

            <div id="publication-list" className="mt-3 divide-y divide-white/10 border-y border-white/10">
              {data.items.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">Nenhuma matéria nesta categoria.</p>
              ) : data.items.map(post => (
                <article key={post.id} className="min-w-0">
                  <details className="group min-w-0">
                    <summary className="list-none cursor-pointer px-3 py-3 transition-colors hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:outline-brand-orange sm:px-4 [&::-webkit-details-marker]:hidden">
                      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3 xl:w-[23rem] xl:shrink-0">
                          <span aria-hidden="true" className="mt-1 flex size-5 shrink-0 items-center justify-center border border-white/15 text-gray-500 transition-transform group-open:rotate-90">
                            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="m6 3 5 5-5 5" /></svg>
                          </span>
                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-semibold leading-5 text-white">{post.title}</h3>
                            {post.site === "published" && post.publishedAt && <p className="mt-1 text-xs text-gray-500">Publicado {formatDate(post.publishedAt)}</p>}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-wrap gap-1.5 xl:justify-end">
                          <SitePill site={post.site} />
                          <StatusPill label="Telegram" status={post.telegram} />
                          <StatusPill label="YouTube" status={post.youtube} />
                          <StatusPill label="Instagram" status={post.instagram} />
                          <StatusPill label="TikTok" status={post.tiktok} />
                        </div>
                      </div>
                    </summary>

                    <div className="grid gap-x-4 px-3 pb-4 sm:grid-cols-2 sm:px-4 xl:grid-cols-5">
                      <section aria-label={`Site: ${post.title}`} className="min-w-0 border-t border-white/10 py-3">
                        <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Site</h4>
                        <SitePill site={post.site} />
                        {post.publishedAt && post.site === "published" && <p className="mt-2 text-xs text-gray-500">{formatDate(post.publishedAt)}</p>}
                        <Link href={post.site === "published" ? `/posts/${post.slug}` : `/admin/edit?id=${post.id}`} className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange">{post.site === "published" ? "Abrir matéria" : "Revisar matéria"}</Link>
                      </section>

                      <section aria-label={`Telegram: ${post.title}`} className="min-w-0 border-t border-white/10 py-3">
                        <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Telegram · aviso ADM</h4>
                        <Delivery status={post.telegram} />
                        {post.site === "published" && post.telegram.canRetry && <button type="button" disabled={loading || Boolean(retrying)} onClick={() => setCandidate(post)} className="mt-2 min-h-10 text-left text-xs font-bold text-brand-orange disabled:opacity-50">Tentar novamente só no Telegram</button>}
                      </section>

                      <section aria-label={`YouTube: ${post.title}`} className="min-w-0 border-t border-white/10 py-3">
                        <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">YouTube</h4>
                        <Delivery status={post.youtube} />
                        {post.youtube.url && <a href={post.youtube.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-brand-orange">Abrir vídeo</a>}
                        {post.youtube.canRetry && <Link href={`/admin/reels?postId=${post.id}`} className="mt-2 flex min-h-10 items-center text-xs font-bold text-brand-orange">Revisar envio no YouTube</Link>}
                        {post.youtube.state === "unknown" && <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-10 items-center text-xs font-bold text-brand-orange">Conferir no YouTube Studio</a>}
                      </section>

                      <section aria-label={`Instagram: ${post.title}`} className="min-w-0 border-t border-white/10 py-3">
                        <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Instagram</h4>
                        <Delivery status={post.instagram} />
                      </section>

                      <section aria-label={`TikTok: ${post.title}`} className="min-w-0 border-t border-white/10 py-3">
                        <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">TikTok</h4>
                        <Delivery status={post.tiktok} />
                      </section>
                    </div>
                  </details>
                </article>
              ))}
            </div>

            <div className="mt-3">
              {data && <Pagination page={data.page} pages={data.pages} pageSize={data.pageSize} total={data.total} loading={loading || Boolean(retrying)} onPageChange={changePage} label="Paginação inferior das matérias" />}
            </div>
          </section>

          <p className="mt-4 text-xs text-gray-500">Última consulta: {formatDate(data.checkedAt)}. Atualização automática a cada 30 segundos enquanto a página estiver visível.</p>
        </>
      )}

      {!data && loading && <p role="status" className="py-8 text-sm text-gray-400">Carregando publicações…</p>}

      {candidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="publication-retry-title" className="w-full max-w-lg rounded-xl border border-amber-400/30 bg-[#0e0f14] p-5">
            <p id="publication-retry-title" className="text-sm font-bold">Tentar enviar novamente o aviso de “{candidate.title}” ao administrador no Telegram?</p>
            <p className="mt-2 text-xs leading-5 text-gray-300">A matéria no site e o envio ao YouTube não serão repetidos.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button disabled={Boolean(retrying)} onClick={() => void retry(candidate)} className="min-h-11 bg-brand-orange px-4 text-sm font-bold text-black disabled:opacity-50">{retrying ? "Enviando aviso…" : "Confirmar nova tentativa"}</button>
              <button disabled={Boolean(retrying)} onClick={() => setCandidate(null)} className="min-h-11 border border-white/20 px-4 text-sm disabled:opacity-50">Cancelar</button>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
