"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { YouTubePublisher } from "@/components/admin/YouTubePublisher";
import { createDataClient } from "@/lib/supabase/client";
import { CATEGORY_CONFIG, type PostCategory } from "@/lib/types/database";
import type { AdminReelItem } from "@/app/api/admin/reels/route";

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function AdminReelsPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [items, setItems] = useState<AdminReelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "generating" | "pending">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Modal de Assistente Social
  const [selectedReel, setSelectedReel] = useState<AdminReelItem | null>(null);
  const [activeTab, setActiveTab] = useState<"instagram" | "tiktok" | "youtube">("youtube");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Status de geração individual
  const [triggeringSlug, setTriggeringSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage((c) => (c === msg ? null : c)), 3500);
  }, []);

  const loadReels = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/reels", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Falha ao carregar lista de reels");
      }

      const data = await res.json();
      setItems(data.items || []);
      setSelectedReel((current) => current ? data.items?.find((item: AdminReelItem) => item.slug === current.slug) || current : null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com o servidor.");
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReels(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReels]);

  // Polling automático caso haja reels em geração
  useEffect(() => {
    const hasGenerating = items.some((i) => i.status === "generating");
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadReels(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [items, loadReels]);

  const handleGenerate = async (slug: string) => {
    setTriggeringSlug(slug);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(30_000),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.queued !== true) {
        throw new Error(result?.error || result?.message || "O servidor não confirmou o início da geração. Atualize a lista antes de tentar novamente.");
      }

      showToast(result.message || "Geração solicitada. Acompanhe o andamento na lista.");
      // Atualiza estado local imediatamente para feedback instantâneo
      setItems((prev) =>
        prev.map((item) =>
          item.slug === slug ? { ...item, status: "generating", started_at: new Date().toISOString() } : item
        )
      );
      setSelectedReel((current) => current?.slug === slug ? { ...current, status: "generating" } : current);
    } catch (err: unknown) {
      const message = err instanceof Error && err.name === "TimeoutError"
        ? "O servidor demorou para confirmar a geração. Atualize a lista antes de tentar novamente."
        : err instanceof Error ? err.message : "Não foi possível iniciar a geração.";
      setError(message);
      showToast(message);
    } finally {
      setTriggeringSlug(null);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast("Copiado com sucesso!");
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 2000);
    } catch {
      showToast("Não foi possível copiar automaticamente.");
    }
  };

  // Filtros
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ready" && item.status === "ready") ||
        (statusFilter === "generating" && item.status === "generating") ||
        (statusFilter === "pending" && (item.status === "pending" || item.status === "failed"));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, categoryFilter]);

  // Contagens
  const stats = useMemo(() => {
    const total = items.length;
    const ready = items.filter((i) => i.status === "ready").length;
    const generating = items.filter((i) => i.status === "generating").length;
    const pending = total - ready - generating;
    return { total, ready, generating, pending };
  }, [items]);

  return (
    <AdminShell
      active="reels"
      title="Central de Reels & Vídeos"
      description="Gerencie vídeos verticais (1080×1920) em motion graphics com narração neural. Cada notícia publicada gera seu vídeo automaticamente."
      wide
      actions={
        <button
          type="button"
          onClick={() => loadReels()}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      }
    >
      {/* TOAST DE FEEDBACK */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border border-brand-orange/40 bg-[#12141c] px-4 py-3 text-sm font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BANNER DE AUTOMAÇÃO E ESTATÍSTICAS */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#0e1017] p-4.5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total de Matérias</p>
          <p className="mt-1 font-heading text-3xl font-black text-white">{stats.total}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            Catálogo editorial monitorado
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4.5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Reels Prontos (MP4)</p>
          <p className="mt-1 font-heading text-3xl font-black text-emerald-300">{stats.ready}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400/80">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Vídeos 1080×1920 finalizados
          </div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4.5">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Em Processamento</p>
          <p className="mt-1 font-heading text-3xl font-black text-amber-300">{stats.generating}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/80">
            <span className={`h-2 w-2 rounded-full bg-amber-400 ${stats.generating > 0 ? "animate-ping" : ""}`} />
            Fila de renderização ativa
          </div>
        </div>

        <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4.5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Automação de Publicação</p>
          <p className="mt-1 font-heading text-xl font-black text-white">ATIVADA ⚡</p>
          <p className="mt-2 text-xs text-gray-300">
            Ao publicar qualquer notícia, o vídeo é gerado em background.
          </p>
        </div>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e1017] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "all" ? "bg-white text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ready")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "ready" ? "bg-emerald-500 text-black font-extrabold" : "text-gray-400 hover:text-emerald-300 hover:bg-white/5"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Prontos ({stats.ready})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("generating")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "generating" ? "bg-amber-500 text-black font-extrabold" : "text-gray-400 hover:text-amber-300 hover:bg-white/5"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Gerando ({stats.generating})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "pending" ? "bg-white text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Pendentes ({stats.pending})
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* FILTRO CATEGORIA */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#141620] px-3 py-1.5 text-xs font-semibold text-gray-300 focus:border-brand-orange focus:outline-none"
          >
            <option value="all">Todas as categorias</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* CAMPO DE BUSCA */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou slug..."
              className="w-full sm:w-64 rounded-lg border border-white/10 bg-[#141620] px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ESTADO DE ERRO */}
      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          <p className="font-bold">Aviso:</p>
          <p>{error}</p>
        </div>
      )}

      {/* LISTAGEM DOS REELS */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent mb-3" />
          <p className="text-sm font-semibold">Carregando catálogo de vídeos...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-center">
          <p className="font-heading text-lg font-black text-gray-300">Nenhum Reel encontrado</p>
          <p className="mt-1 max-w-md text-xs text-gray-500">
            Tente ajustar os filtros de busca ou gere um vídeo a partir de uma das matérias.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const cat = CATEGORY_CONFIG[item.category as PostCategory] || { label: "Plantão", color: "#FF5E00" };
            const isGenerating = item.status === "generating" || triggeringSlug === item.slug;
            const isReady = item.status === "ready";

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0e1017] transition-all hover:border-white/20 hover:shadow-xl"
              >
                <div>
                  {/* THUMBNAIL DA MATÉRIA */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#181a24] text-xs text-gray-600 font-bold">
                        SEM CAPA
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* BADGE CATEGORIA */}
                    <span
                      style={{ backgroundColor: cat.color }}
                      className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-black uppercase text-black"
                    >
                      {cat.label}
                    </span>

                    {/* STATUS BADGE NO CANTO SUPERIOR DIREITO */}
                    <div className="absolute right-3 top-3">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-black uppercase text-black backdrop-blur-sm shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-black" />
                          PRONTO
                        </span>
                      ) : isGenerating ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-black backdrop-blur-sm animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-black" />
                          GERANDO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300 backdrop-blur-sm">
                          PENDENTE
                        </span>
                      )}
                    </div>

                    {/* OVERLAY PLAY BUTTON SE PRONTO */}
                    {isReady && (
                      <button
                        type="button"
                        onClick={() => setSelectedReel(item)}
                        aria-label="Abrir pré-visualização e assistente do Reel"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-white shadow-2xl transition-transform hover:scale-110">
                          <svg className="h-5 w-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </span>
                      </button>
                    )}
                  </div>

                  {/* INFORMAÇÕES DO POST */}
                  <div className="p-4">
                    <p className="text-[11px] font-semibold text-gray-400">
                      {item.is_published ? "Publicado em" : "Criado em"} {formatDate(item.published_at || item.created_at)}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-heading text-sm font-black leading-snug text-white">
                      {item.title}
                    </h3>

                    {/* METADADOS DO REEL */}
                    {isReady && (
                      <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2 text-[11px] text-gray-400">
                        <span>⏱️ {item.duration ? `${item.duration}s` : "35s"}</span>
                        <span>💾 {formatBytes(item.file_size)}</span>
                        <span className="text-emerald-400 font-bold">1080×1920</span>
                      </div>
                    )}

                    {isGenerating && (
                      <div className="mt-3 flex items-center gap-2 border-t border-amber-500/20 pt-2 text-[11px] text-amber-300 font-semibold">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                        Sintetizando voz e renderizando quadros...
                      </div>
                    )}

                    {item.status === "failed" && !isGenerating && (
                      <p className="mt-2 text-[11px] text-red-400">
                        {item.error || "Houve uma falha na renderização anterior."}
                      </p>
                    )}
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="border-t border-white/10 p-3 pt-2.5">
                  {isReady ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReel(item)}
                        className="flex-1 rounded-lg bg-brand-orange px-3 py-2 text-center text-xs font-black uppercase text-white transition-colors hover:bg-brand-orange/90"
                      >
                        Assistente Social
                      </button>
                      <a
                        href={item.video_url}
                        download={`${item.slug}.mp4`}
                        className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                        title="Baixar arquivo MP4"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerate(item.slug)}
                      className={`w-full rounded-lg px-3 py-2 text-center text-xs font-black uppercase transition-all ${
                        isGenerating
                          ? "cursor-not-allowed bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-white/[0.08] text-white hover:bg-brand-orange hover:text-black border border-white/10"
                      }`}
                    >
                      {isGenerating ? "Processando..." : "Gerar Reel com IA"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL ASSISTENTE DE POSTAGEM SOCIAL */}
      {selectedReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl border border-white/15 bg-[#0e1017] shadow-2xl lg:flex-row lg:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÃO FECHAR */}
            <button
              type="button"
              onClick={() => setSelectedReel(null)}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Fechar assistente de postagem"
            >
              ✕
            </button>

            {/* COLUNA ESQUERDA: PLAYER VERTICAL 9:16 */}
            <div className="flex shrink-0 flex-col items-center justify-center border-b border-white/10 bg-black/60 p-4 lg:w-[380px] lg:border-b-0 lg:border-r">
              <div className="relative aspect-[9/16] w-[260px] max-w-full overflow-hidden rounded-2xl border-2 border-white/10 bg-black shadow-2xl">
                {selectedReel.video_url ? (
                  <video
                    src={selectedReel.video_url}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    Vídeo indisponível
                  </div>
                )}
              </div>

              {/* AÇÕES E DETALHES TÉCNICOS */}
              <div className="mt-3 flex w-full max-w-[260px] flex-col gap-2">
                <a
                  href={selectedReel.video_url}
                  download={`${selectedReel.slug}.mp4`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-2 text-xs font-black uppercase text-white shadow-lg transition-colors hover:bg-brand-orange/90"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar Vídeo (MP4)
                </a>

                <button
                  type="button"
                  onClick={() => handleGenerate(selectedReel.slug)}
                  disabled={selectedReel.status === "generating" || triggeringSlug === selectedReel.slug}
                  className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] font-bold text-gray-400 hover:text-white hover:bg-white/10"
                >
                  {selectedReel.status === "generating" || triggeringSlug === selectedReel.slug ? "Processando..." : "Regerar este vídeo com IA"}
                </button>
              </div>
            </div>

            {/* COLUNA DIREITA: ASSISTENTE DE COPYS PRONTAS */}
            <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-7 lg:overflow-y-auto">
              <div>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-brand-orange">
                  Assistente de Publicação
                </span>
                <h2 className="mt-1 font-heading text-xl font-black text-white sm:text-2xl leading-snug">
                  {selectedReel.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                  {selectedReel.summary}
                </p>
              </div>

              {/* SELETOR DE REDE SOCIAL */}
              <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("instagram")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "instagram"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>📸 Instagram Reels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tiktok")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "tiktok"
                      ? "bg-[#fe2c55] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>🎵 TikTok</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("youtube")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "youtube"
                      ? "bg-[#ff0000] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>🔴 YouTube Shorts</span>
                </button>
              </div>

              {/* CONTEÚDO DA ABA ATIVA */}
              <div className="mt-4 flex-1">
                {activeTab === "instagram" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-300">Legenda:</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedReel.copys.instagram.caption, "ig-caption")}
                        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
                      >
                        {copiedKey === "ig-caption" ? "Copiado! ✓" : "Copiar Legenda"}
                      </button>
                    </div>

                    <textarea
                      readOnly
                      rows={9}
                      value={selectedReel.copys.instagram.caption}
                      className="w-full rounded-xl border border-white/10 bg-[#07080c] p-3.5 text-xs font-mono leading-relaxed text-gray-200 focus:outline-none"
                    />

                    <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3 text-[11px] text-purple-200">
                      💡 <strong>Dica de Postagem:</strong> Abra o app do Instagram, selecione o vídeo baixado e cole essa legenda. O link na bio direciona para a matéria completa no Orange Brick.
                    </div>
                  </div>
                )}

                {activeTab === "tiktok" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-300">Descrição:</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedReel.copys.tiktok.caption, "tt-caption")}
                        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/20"
                      >
                        {copiedKey === "tt-caption" ? "Copiado! ✓" : "Copiar Texto TikTok"}
                      </button>
                    </div>

                    <textarea
                      readOnly
                      rows={7}
                      value={selectedReel.copys.tiktok.caption}
                      className="w-full rounded-xl border border-white/10 bg-[#07080c] p-3.5 text-xs font-mono leading-relaxed text-gray-200 focus:outline-none"
                    />

                    <div className="rounded-xl border border-pink-500/20 bg-pink-950/10 p-3 text-[11px] text-pink-200">
                      💡 <strong>Dica de Postagem:</strong> No TikTok Studio ou no app móvel, cole a descrição acima e selecione o som original do vídeo (a narração e mixagem já vêm embutidas no arquivo).
                    </div>
                  </div>
                )}

                {activeTab === "youtube" && (
                  <YouTubePublisher
                    key={`${selectedReel.id}:${selectedReel.reel_job_id}`}
                    postId={selectedReel.id}
                    reelJobId={selectedReel.reel_job_id}
                    initialTitle={selectedReel.copys.youtube.title}
                    initialDescription={selectedReel.copys.youtube.description}
                    ready={selectedReel.status === "ready"}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
