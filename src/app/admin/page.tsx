"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import type { Post, PostCategory } from "@/lib/types/database";

type StatusFilter = "all" | "production" | "revision" | "scheduled" | "published";

const CATEGORY_LABELS: Record<PostCategory, string> = {
  breaking: "Plantão",
  industry: "Indústria",
  hardware: "Hardware",
  review: "Review",
  opinion: "Opinião",
  modding: "Modding",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [PostCategory, string][];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string) {
  const d = new Date(value);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === d.toDateString();

  const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `hoje, ${timeStr}`;
  if (isTomorrow) return `amanhã, ${timeStr}`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-6">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(15, (v / max) * 100)}%` }}
          className={`w-1 rounded-sm ${color}`}
        />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<PostCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [selectedEditor, setSelectedEditor] = useState<string>("all");
  const [sortOrder] = useState<"date" | "title">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardNow] = useState(() => Date.now());

  const checkAdminAndFetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!isAdminUser(user)) {
        router.push("/admin/login");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("updated_at", { ascending: false })
        .returns<Post[]>();

      if (fetchError) throw fetchError;
      setPosts(data || []);
    } catch (err: unknown) {
      setError(errorMessage(err, "Não foi possível carregar as matérias."));
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void checkAdminAndFetchPosts());
  }, [checkAdminAndFetchPosts]);

  const publishedCount = useMemo(() => posts.filter(p => p.is_published).length, [posts]);
  const draftsCount = useMemo(() => posts.filter(p => !p.is_published).length, [posts]);
  const inProductionCount = draftsCount;
  const inRevisionCount = 0;
  const scheduledCount = 0;
  const recentDrafts = useMemo(() => posts.filter((post) => !post.is_published).slice(0, 3), [posts]);
  const weeklyPublished = useMemo(() => {
    const start = dashboardNow - 6 * 24 * 60 * 60 * 1000;
    return posts.filter((post) => post.is_published && new Date(post.published_at || post.updated_at).getTime() >= start);
  }, [dashboardNow, posts]);
  const weeklyRhythm = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(dashboardNow);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
      val: weeklyPublished.filter((post) => {
        const published = new Date(post.published_at || post.updated_at);
        return published >= date && published < next;
      }).length,
    };
  }), [dashboardNow, weeklyPublished]);
  const categoryDistribution = useMemo(() => CATEGORY_OPTIONS.map(([category, label]) => ({
    category,
    label,
    count: posts.filter((post) => post.category === category).length,
  })).filter((item) => item.count > 0), [posts]);

  // Filtragem das matérias
  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return posts.filter(post => {
      if (filterCategory !== "all" && post.category !== filterCategory) return false;
      if (filterStatus === "published" && !post.is_published) return false;
      if (filterStatus === "production" && post.is_published) return false;
      if ((filterStatus === "revision" || filterStatus === "scheduled")) return false;
      if (selectedEditor !== "all" && post.author_name !== selectedEditor) return false;
      if (!query) return true;
      return [post.title, post.slug, post.author_name].some(v => v.toLowerCase().includes(query));
    }).sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title, "pt-BR");
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filterCategory, filterStatus, posts, searchQuery, selectedEditor, sortOrder]);

  const authorsList = useMemo(() => {
    return Array.from(new Set(posts.map(p => p.author_name).filter(Boolean)));
  }, [posts]);

  // Paginação
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPosts.slice(start, start + pageSize);
  }, [filteredPosts, currentPage]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0b0e] text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
          <p className="text-sm text-gray-400">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      active="overview"
      title="Visão geral"
      description="Acompanhe o que está publicado, encontre pendências e mova cada matéria para a próxima etapa."
      actions={
        <Link
          href="/admin/edit"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-[#ff7526]"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          Nova matéria
        </Link>
      }
      wide
    >
      {error && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold text-red-300 hover:text-white">Fechar</button>
        </div>
      )}

      {/* CARDS KPIS NO TOPO */}
      <section aria-label="Estatísticas gerais" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* PUBLICADAS */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Publicadas</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">{publishedCount}</p>
            <p className="mt-1 text-[11px] text-gray-500">Total no banco</p>
          </div>
          <MiniBarChart values={weeklyRhythm.map((day) => day.val)} color="bg-emerald-500" />
        </div>

        {/* EM PRODUÇÃO */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Em produção</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">{inProductionCount}</p>
            <p className="mt-1 text-[11px] text-gray-500">Rascunhos</p>
          </div>
          <MiniBarChart values={[draftsCount]} color="bg-brand-orange" />
        </div>

        {/* AGUARDANDO REVISÃO */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Aguardando revisão</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">{inRevisionCount}</p>
            <p className="mt-1 text-[11px] text-gray-500">Fluxo não configurado</p>
          </div>
          <MiniBarChart values={[0]} color="bg-amber-400" />
        </div>

        {/* AGENDADAS */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Agendadas</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">{scheduledCount}</p>
            <p className="mt-1 text-[11px] text-gray-500">Agendamento não configurado</p>
          </div>
          <MiniBarChart values={[0]} color="bg-sky-400" />
        </div>
      </section>

      {/* CORPO DA PÁGINA (TABELA + SIDEBAR DE WIDGETS) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">

        {/* FILA EDITORIAL */}
        <section aria-labelledby="editorial-queue-title" className="rounded-xl border border-white/10 bg-[#0e0f14]">
          {/* HEADER DA TABELA */}
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 id="editorial-queue-title" className="font-heading text-base font-bold text-white">
                Fila editorial
              </h2>
              <span className="text-xs text-gray-500 font-semibold">{filteredPosts.length} matérias</span>
            </div>

            {/* TABS DE STATUS */}
            <div className="flex items-center gap-1 border-b border-white/10 sm:border-b-0 pb-2 sm:pb-0 overflow-x-auto">
              {([
                ["all", "Todas"],
                ["production", "Em produção"],
                ["revision", "Revisão"],
                ["scheduled", "Agendadas"],
                ["published", "Publicadas"],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setFilterStatus(val); setCurrentPage(1); }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    filterStatus === val
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* FILTROS E BUSCA */}
          <div className="p-4 border-b border-white/10 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por título, autor ou assunto"
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white outline-none focus:border-brand-orange/40"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value as PostCategory | "all"); setCurrentPage(1); }}
              className="h-9 rounded-lg border border-white/10 bg-[#0e0f14] px-3 text-xs text-gray-300 outline-none focus:border-brand-orange/40"
            >
              <option value="all">Todas as categorias</option>
              {CATEGORY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              value={selectedEditor}
              onChange={(e) => { setSelectedEditor(e.target.value); setCurrentPage(1); }}
              className="h-9 rounded-lg border border-white/10 bg-[#0e0f14] px-3 text-xs text-gray-300 outline-none focus:border-brand-orange/40"
            >
              <option value="all">Todos os editores</option>
              {authorsList.map((author) => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>

          {/* TABELA DE MATÉRIAS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[10px] uppercase font-bold text-gray-500 bg-white/[0.01]">
                <tr>
                  <th className="py-3 px-4">Matéria</th>
                  <th className="py-3 px-4">Categoria / Autor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Prazo / Publicação</th>
                  <th className="py-3 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Nenhuma matéria encontrada.
                    </td>
                  </tr>
                ) : (
                  paginatedPosts.map((post) => {
                    return (
                      <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* MATÉRIA (Capa + Título) */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-[#08090C]">
                              {post.image_url ? (
                                <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[9px] text-gray-600">Sem capa</div>
                              )}
                            </div>
                            <span className="font-bold text-white leading-snug line-clamp-2 uppercase">
                              {post.title}
                            </span>
                          </div>
                        </td>

                        {/* CATEGORIA / AUTOR */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <span className="h-2 w-2 rounded-full bg-brand-orange" />
                            {CATEGORY_LABELS[post.category] || post.category}
                          </div>
                          <p className="mt-0.5 text-gray-500">{post.author_name}</p>
                        </td>

                        {/* STATUS */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {post.is_published ? (
                            <span className="inline-block rounded px-2 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              Publicada
                            </span>
                          ) : (
                            <span className="inline-block rounded px-2 py-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              Em revisão
                            </span>
                          )}
                        </td>

                        {/* RESPONSÁVEL */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-[10px] font-bold text-brand-orange">
                              {post.author_name.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-300">{post.author_name.split(" ")[0]}</span>
                          </div>
                        </td>

                        {/* PRAZO / PUBLICAÇÃO */}
                        <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                          {post.is_published ? (
                            <span>{formatDate(post.published_at || post.updated_at)}</span>
                          ) : (
                            <Link
                              href={`/admin/edit?id=${post.id}`}
                              className="inline-block rounded border border-brand-orange px-2.5 py-1 text-[11px] font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
                            >
                              Continuar edição
                            </Link>
                          )}
                        </td>

                        {/* AÇÕES */}
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/edit?id=${post.id}`}
                            className="p-1.5 text-gray-500 hover:text-white transition-colors"
                            title="Editar matéria"
                          >
                            ⋮
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ DA TABELA */}
          <div className="flex items-center justify-between border-t border-white/10 p-4 text-xs text-gray-500">
            <span>Mostrando {filteredPosts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredPosts.length)} de {filteredPosts.length} matérias</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/5"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-7 w-7 items-center justify-center rounded font-bold transition-colors ${
                    currentPage === page ? "bg-brand-orange text-white" : "border border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/5"
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {/* WIDGETS DA DIREITA */}
        <aside className="space-y-4">
          {/* PRIORIDADES DE HOJE */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Prioridades de hoje</h3>
              <span className="text-[10px] font-bold text-brand-orange">{recentDrafts.length} rascunhos</span>
            </div>
            <div className="mt-3 space-y-3">
              {recentDrafts.length === 0 ? (
                <p className="py-3 text-xs text-gray-500">Nenhum rascunho pendente.</p>
              ) : recentDrafts.map((post) => (
                <Link key={post.id} href={`/admin/edit?id=${post.id}`} className="block text-xs font-semibold text-gray-300 hover:text-white">
                  <span className="line-clamp-2">{post.title}</span>
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <Link href="/admin?status=production" className="flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-white">
                <span>Ver todos os rascunhos</span><span>›</span>
              </Link>
            </div>
          </div>

          {/* RITMO DA REDAÇÃO */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Ritmo da redação</h3>
              <span className="text-[10px] text-gray-500">Últimos 7 dias</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black font-heading text-white">{weeklyPublished.length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">publicações nesta semana</p>
            </div>
            {/* GRÁFICO DE BARRAS DA SEMANA */}
            <div className="mt-4 flex items-end justify-between gap-2 h-20 border-b border-white/10 pb-2">
              {weeklyRhythm.map((item) => (
                <div key={item.day} className="flex flex-col items-center flex-1 h-full justify-end">
                  <span className="text-[9px] font-bold text-gray-400 mb-1">{item.val}</span>
                  <div
                    style={{ height: `${weeklyPublished.length > 0 ? Math.max(8, (item.val / Math.max(...weeklyRhythm.map((day) => day.val), 1)) * 100) : 0}%` }}
                    className="w-full bg-brand-orange rounded-t-sm transition-all"
                  />
                  <span className="mt-1 text-[9px] font-semibold text-gray-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DISTRIBUIÇÃO EDITORIAL */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Distribuição editorial</h3>
              <span className="text-[10px] text-gray-500">Todas as matérias</span>
            </div>
            <div className="mt-3 space-y-3">
              {categoryDistribution.length === 0 ? (
                <p className="py-3 text-xs text-gray-500">Nenhuma matéria cadastrada.</p>
              ) : categoryDistribution.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-300">{item.label}</span>
                    <span className="font-bold text-gray-500">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange rounded-full" style={{ width: `${(item.count / Math.max(posts.length, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
