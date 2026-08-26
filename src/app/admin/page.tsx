"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { PublishConfirmModal } from "@/components/admin/PublishConfirmModal";
import { isAdminUser } from "@/lib/auth";
import { validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
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
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
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

type PaginatedPost = Pick<Post, "id" | "slug" | "title" | "summary" | "category" | "image_url" | "author_name" | "is_published" | "published_at" | "created_at" | "updated_at" | "scheduled_at">;

interface StatsData {
  publishedCount: number;
  draftsCount: number;
  scheduledCount: number;
  authorsList: string[];
}

interface PaginatedResponse {
  posts: PaginatedPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [posts, setPosts] = useState<PaginatedPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<PostCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [selectedEditor, setSelectedEditor] = useState<string>("all");
  const [sortOrder] = useState<"date" | "title">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardNow] = useState(() => Date.now());
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishCandidate, setPublishCandidate] = useState<PaginatedPost | null>(null);
  const [publishOnBrickboard, setPublishOnBrickboard] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [brickboardPostingId, setBrickboardPostingId] = useState<string | null>(null);
  const [brickboardMessage, setBrickboardMessage] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<PaginatedPost | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchCategory, setBatchCategory] = useState<PostCategory | "">("");
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [stats, setStats] = useState<StatsData>({ publishedCount: 0, draftsCount: 0, scheduledCount: 0, authorsList: [] });
  const [recentDrafts, setRecentDrafts] = useState<PaginatedPost[]>([]);
  const [weeklyPublished, setWeeklyPublished] = useState<{ published_at: string | null }[]>([]);
  const [categoryDistributionRaw, setCategoryDistribution] = useState<{ category: string; count: number }[]>([]);

  const updateSelectedCategory = async () => {
    if (!batchCategory || selectedIds.length === 0) return;
    setIsBatchUpdating(true);
    setError(null);
    try {
      const updatedAt = new Date().toISOString();
      const { error: updateError } = await supabase.from("posts").update({ category: batchCategory, updated_at: updatedAt }).in("id", selectedIds);
      if (updateError) throw updateError;
      setPosts((current) => current.map((post) => selectedIds.includes(post.id) ? { ...post, category: batchCategory, updated_at: updatedAt } : post));
      setSelectedIds([]);
      setBatchCategory("");
    } catch (batchError) {
      setError(errorMessage(batchError, "Não foi possível alterar a categoria das matérias selecionadas."));
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const deletePost = async (post: PaginatedPost) => {
    setDeletingId(post.id);
    setDeleteError(null);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sua sessão expirou. Entre novamente para excluir a matéria.");
      const response = await fetch(`/api/admin/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "O banco não confirmou a exclusão da matéria.");

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setCurrentPage(1);
      setDeleteCandidate(null);
    } catch (err: unknown) {
      const message = errorMessage(err, "Não foi possível excluir a matéria. Tente novamente.");
      setDeleteError(message);
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const postPublishedArticleOnBrickboard = async (post: PaginatedPost) => {
    setBrickboardPostingId(post.id);
    setBrickboardMessage(null);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sua sessão expirou. Entre novamente para publicar no Brickboard.");

      const { data: existingThread, error: lookupError } = await supabase
        .from("community_posts")
        .select("id")
        .eq("source_post_id", post.id)
        .eq("is_official_thread", true)
        .maybeSingle();
      if (lookupError) throw new Error("Não foi possível verificar se a matéria já está no Brickboard.");

      if (existingThread) {
        setBrickboardMessage(`“${post.title}” já possui uma publicação oficial no Brickboard.`);
        return;
      }

      const { error: threadError } = await supabase.from("community_posts").insert({
        user_id: user.id,
        author_name: "Orange Brick",
        author_avatar: "",
        content: post.summary.slice(0, 280),
        media_url: null,
        platform_tag: null,
        attached_article: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          image_url: post.image_url,
          category: post.category,
        },
        is_official: true,
        is_pinned: false,
        source_post_id: post.id,
        is_official_thread: true,
      });
      if (threadError) throw new Error("A publicação no Brickboard falhou.");
      setBrickboardMessage(`"${post.title}" foi publicada no Brickboard.`);
    } catch (postingError) {
      setError(errorMessage(postingError, "Não foi possível publicar a matéria no Brickboard."));
    } finally {
      setBrickboardPostingId(null);
    }
  };

  const publishPost = async (post: PaginatedPost) => {
    setPublishingId(post.id);
    setError(null);
    setPublishError(null);

    try {
      const { data: fullPost, error: fetchBodyError } = await supabase
        .from("posts")
        .select("body")
        .eq("id", post.id)
        .single();
      if (fetchBodyError || !fullPost) throw new Error("Não foi possível carregar o conteúdo da matéria.");

      const blocks = JSON.parse(String(fullPost.body)) as EditorialBlock[];
      const validationErrors = validateEditorialContent({
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        imageUrl: post.image_url || "",
        imageAlt: "",
        blocks,
      });

      if (validationErrors.length > 0) throw new Error(validationErrors.join(" "));

      const publishedAt = new Date().toISOString();
      const { data, error: publishError } = await supabase
        .from("posts")
        .update({
          is_published: true,
          published_at: publishedAt,
          updated_at: publishedAt,
        })
        .eq("id", post.id)
        .select("*")
        .single();

      if (publishError) throw publishError;
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, is_published: true, published_at: publishedAt, updated_at: publishedAt } : item));

      if (publishOnBrickboard) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("A matéria foi publicada, mas sua sessão expirou antes da publicação no Brickboard.");

        const { data: existingThread, error: threadLookupError } = await supabase
          .from("community_posts")
          .select("id")
          .eq("source_post_id", post.id)
          .eq("is_official_thread", true)
          .maybeSingle();

        if (threadLookupError) throw new Error("A matéria foi publicada, mas não foi possível verificar o Brickboard.");

        if (!existingThread) {
          const { error: threadError } = await supabase.from("community_posts").insert({
            user_id: user.id,
            author_name: "Orange Brick",
            author_avatar: "",
            content: post.summary.slice(0, 280),
            media_url: null,
            platform_tag: null,
            attached_article: {
              id: post.id,
              slug: post.slug,
              title: post.title,
              summary: post.summary,
              image_url: post.image_url,
              category: post.category,
            },
            is_official: true,
            is_pinned: false,
            source_post_id: post.id,
            is_official_thread: true,
          });

          if (threadError) throw new Error("A matéria foi publicada, mas a publicação no Brickboard falhou.");
        }
      }

      setPublishCandidate(null);
      setPublishOnBrickboard(false);
      setPublishError(null);
    } catch (err: unknown) {
      const message = errorMessage(err, "Não foi possível publicar a matéria.");
      setError(message);
      setPublishError(message);
    } finally {
      setPublishingId(null);
    }
  };

  const fetchPosts = useCallback(async (page: number, category: string, status: string, editor: string, search: string, sort: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (editor !== "all") params.set("editor", editor);
      if (search) params.set("search", search);
      if (sort === "title") params.set("sort", "title");

      const res = await fetch(`/api/admin/posts?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar matérias");
      const data: PaginatedResponse = await res.json();
      setPosts(data.posts);
      setTotalPosts(data.total);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(errorMessage(err, "Não foi possível carregar as matérias."));
    }
  }, [supabase]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [statsRes, draftsRes, weeklyRes, distRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from("posts").select("id,slug,title,summary,category,image_url,author_name,is_published,published_at,updated_at").eq("is_published", false).order("updated_at", { ascending: false }).limit(3),
        supabase.from("posts").select("published_at").eq("is_published", true).gte("published_at", new Date(dashboardNow - 6 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("posts").select("category"),
      ]);

      if (statsRes.ok) {
        const data: StatsData = await statsRes.json();
        setStats(data);
      }
      setRecentDrafts((draftsRes.data || []) as PaginatedPost[]);
      setWeeklyPublished((weeklyRes.data || []) as { published_at: string | null }[]);
      const cats = (distRes.data || []) as { category: string }[];
      const catMap = new Map<string, number>();
      cats.forEach((r) => catMap.set(r.category, (catMap.get(r.category) || 0) + 1));
      setCategoryDistribution(Array.from(catMap.entries()).map(([category, count]) => ({ category, count })));
    } catch {
      // Stats are non-critical, fail silently
    }
  }, [supabase, dashboardNow]);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data: { user } } = await supabase.auth.getUser();
        if (!isAdminUser(user)) {
          router.push("/admin/login");
          return;
        }
        await Promise.all([
          fetchPosts(1, "all", "all", "all", "", "date"),
          fetchStats(),
        ]);
      } catch (err: unknown) {
        setError(errorMessage(err, "Não foi possível carregar as matérias."));
      } finally {
        setIsLoading(false);
      }
    };
    queueMicrotask(() => void init());
  }, [supabase, router, fetchPosts, fetchStats]);

  useEffect(() => {
    if (!isLoading) {
      void fetchPosts(currentPage, filterCategory, filterStatus, selectedEditor, searchQuery, sortOrder);
    }
  }, [currentPage, filterCategory, filterStatus, selectedEditor, searchQuery, sortOrder, isLoading, fetchPosts]);

  // Filtragem das matérias
  const publishedCount = stats.publishedCount;
  const inProductionCount = stats.draftsCount;
  const inRevisionCount = 0;
  const scheduledCount = stats.scheduledCount;
  const authorsList = stats.authorsList;

  const weeklyRhythm = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(dashboardNow);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
      val: weeklyPublished.filter((post) => {
        const published = new Date(post.published_at || new Date().toISOString());
        return published >= date && published < next;
      }).length,
    };
  }), [dashboardNow, weeklyPublished]);

  const categoryDistribution = useMemo(() => CATEGORY_OPTIONS.map(([category, label]) => ({
    category,
    label,
    count: categoryDistributionRaw.find(c => c.category === category)?.count || 0,
  })).filter((item) => item.count > 0), [categoryDistributionRaw]);

  const allVisibleSelected = posts.length > 0 && posts.every((post) => selectedIds.includes(post.id));

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
      {brickboardMessage && (
        <div role="status" aria-live="polite" className="mb-5 flex items-start justify-between gap-4 border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <span>{brickboardMessage}</span>
          <button type="button" onClick={() => setBrickboardMessage(null)} className="min-h-11 shrink-0 px-2 font-bold text-emerald-300 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange">Fechar</button>
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
            <p className="mt-1 text-xs text-gray-500">Total no banco</p>
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
            <p className="mt-1 text-xs text-gray-500">Rascunhos</p>
          </div>
          <MiniBarChart values={[inProductionCount]} color="bg-brand-orange" />
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
            <p className="mt-1 text-xs text-gray-500">Fluxo não configurado</p>
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
            <p className="mt-1 text-xs text-gray-500">Agendamento não configurado</p>
          </div>
          <MiniBarChart values={[0]} color="bg-sky-400" />
        </div>
      </section>

      {/* CORPO DA PÁGINA (TABELA + SIDEBAR DE WIDGETS) */}
      <div className="grid grid-cols-1 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">

        {/* FILA EDITORIAL */}
        <section aria-labelledby="editorial-queue-title" className="rounded-xl border border-white/10 bg-[#0e0f14]">
          {/* HEADER DA TABELA */}
          <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 id="editorial-queue-title" className="font-heading text-base font-bold text-white">
                Fila editorial
              </h2>
              <span className="text-xs text-gray-500 font-semibold">{totalPosts} matérias</span>
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

          {selectedIds.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-brand-orange/25 bg-brand-orange/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
              <strong className="text-xs text-brand-orange">{selectedIds.length} {selectedIds.length === 1 ? "matéria selecionada" : "matérias selecionadas"}</strong>
              <div className="flex flex-col gap-2 xs:flex-row">
                <select value={batchCategory} onChange={(event) => setBatchCategory(event.target.value as PostCategory | "")} className="min-h-11 rounded-lg border border-white/10 bg-[#111218] px-3 text-xs text-white outline-none focus:border-brand-orange">
                  <option value="">Trocar categoria…</option>
                  {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" onClick={() => void updateSelectedCategory()} disabled={!batchCategory || isBatchUpdating} className="min-h-11 rounded-lg bg-brand-orange px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isBatchUpdating ? "Atualizando…" : "Aplicar"}</button>
                <button type="button" onClick={() => setSelectedIds([])} disabled={isBatchUpdating} className="min-h-11 rounded-lg border border-white/10 px-4 text-xs font-bold text-gray-300 hover:bg-white/5">Cancelar</button>
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO ADAPTATIVA: CARDS NO MOBILE (sm:hidden) */}
          <div className="divide-y divide-white/10 sm:hidden">
            {posts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                Nenhuma matéria encontrada.
              </div>
            ) : (
              posts.map((post) => {
                return (
                  <article key={post.id} className="p-3.5 space-y-3 transition-colors hover:bg-white/[0.02]">
                    {/* TOPO DO CARD: STATUS, CATEGORIA E MENU */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(post.id)}
                          onChange={() => setSelectedIds((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])}
                          aria-label={`Selecionar ${post.title}`}
                          className="size-4 shrink-0 accent-brand-orange"
                        />
                        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-xs font-bold text-gray-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                        {post.is_published ? (
                          <span className="inline-block rounded px-2 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                            Publicada
                          </span>
                        ) : (
                          <span className="inline-block rounded px-2 py-0.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                            Em revisão
                          </span>
                        )}
                      </div>

                      {/* MENU DE AÇÕES MOBILE */}
                      <details className="group/actions relative inline-block text-left">
                        <summary
                          className="flex min-h-9 min-w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm font-bold text-gray-400 hover:text-white [&::-webkit-details-marker]:hidden"
                          aria-label={`Abrir ações de ${post.title}`}
                        >
                          ⋮
                        </summary>
                        <div className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#15161b] p-1.5 shadow-xl shadow-black/60">
                          <Link
                            href={`/admin/edit?id=${post.id}`}
                            className="flex min-h-10 items-center px-3 text-xs font-bold text-gray-200 transition-colors hover:bg-white/[0.06]"
                          >
                            Editar matéria
                          </Link>
                          {post.is_published && (
                            <>
                              <Link
                                href={`/posts/${post.slug}`}
                                target="_blank"
                                className="flex min-h-10 items-center px-3 text-xs font-bold text-gray-200 transition-colors hover:bg-white/[0.06]"
                              >
                                Ver no portal ↗
                              </Link>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest("details")?.removeAttribute("open");
                                  void postPublishedArticleOnBrickboard(post);
                                }}
                                disabled={brickboardPostingId === post.id}
                                className="flex min-h-10 w-full items-center px-3 text-left text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange/10 disabled:opacity-60"
                              >
                                {brickboardPostingId === post.id ? "Publicando..." : "Publicar no Brickboard"}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.currentTarget.closest("details")?.removeAttribute("open");
                              setDeleteCandidate(post);
                              setDeleteError(null);
                            }}
                            className="flex min-h-10 w-full items-center px-3 text-left text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            Excluir matéria
                          </button>
                        </div>
                      </details>
                    </div>

                    {/* CORPO DO CARD: CAPA + TÍTULO */}
                    <div className="flex items-start gap-3">
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-[#08090C] border border-white/5">
                        {post.image_url ? (
                          <img loading="lazy" decoding="async" src={post.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-gray-600 font-semibold">Sem capa</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/edit?id=${post.id}`} className="block">
                          <h3 className="font-heading text-xs font-bold uppercase leading-snug text-white line-clamp-2 hover:text-brand-orange transition-colors">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="mt-1 text-xs text-gray-500">
                          {post.author_name.split(" ")[0]} • {formatDate(post.published_at || post.updated_at)}
                        </p>
                      </div>
                    </div>

                    {/* BOTÕES DE AÇÃO RÁPIDA NO MOBILE */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {post.is_published ? (
                        <>
                          <Link
                            href={`/posts/${post.slug}`}
                            target="_blank"
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-bold text-gray-200 transition-colors hover:bg-white/10 active:scale-95"
                          >
                            Ver ao vivo ↗
                          </Link>
                          <Link
                            href={`/admin/edit?id=${post.id}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-brand-orange/15 text-xs font-bold text-brand-orange border border-brand-orange/30 transition-colors hover:bg-brand-orange hover:text-white active:scale-95"
                          >
                            Editar
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={`/admin/edit?id=${post.id}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-brand-orange/50 bg-brand-orange/10 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white active:scale-95"
                          >
                            Continuar edição
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setPublishCandidate(post);
                              setPublishOnBrickboard(false);
                              setPublishError(null);
                            }}
                            disabled={publishingId === post.id}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-white transition-colors hover:bg-emerald-400 disabled:opacity-60 active:scale-95"
                          >
                            {publishingId === post.id ? "Publicando..." : "Publicar"}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* TABELA DE MATÉRIAS NO DESKTOP (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-xs uppercase font-bold text-gray-500 bg-white/[0.01]">
                <tr>
                  <th className="w-12 py-3 pl-4"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !posts.some((post) => post.id === id)) : Array.from(new Set([...current, ...posts.map((post) => post.id)])))} aria-label="Selecionar matérias desta página" className="size-4 accent-brand-orange" /></th>
                  <th className="py-3 px-4">Matéria</th>
                  <th className="py-3 px-4">Categoria / Autor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Prazo / Publicação</th>
                  <th className="py-3 px-2 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      Nenhuma matéria encontrada.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    return (
                      <tr key={post.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3 pl-4"><input type="checkbox" checked={selectedIds.includes(post.id)} onChange={() => setSelectedIds((current) => current.includes(post.id) ? current.filter((id) => id !== post.id) : [...current, post.id])} aria-label={`Selecionar ${post.title}`} className="size-4 accent-brand-orange" /></td>
                        {/* MATÉRIA (Capa + Título) */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-[#08090C]">
                              {post.image_url ? (
                                <img loading="lazy" decoding="async" src={post.image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-gray-600">Sem capa</div>
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
                            <span className="inline-block rounded px-2 py-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              Publicada
                            </span>
                          ) : (
                            <span className="inline-block rounded px-2 py-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              Em revisão
                            </span>
                          )}
                        </td>

                        {/* RESPONSÁVEL */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
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
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/edit?id=${post.id}`}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-brand-orange px-3 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60"
                              >
                                Continuar edição
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setPublishCandidate(post);
                                  setPublishOnBrickboard(false);
                                  setPublishError(null);
                                }}
                                disabled={publishingId === post.id}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-500 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-wait disabled:opacity-60"
                              >
                                {publishingId === post.id ? "Publicando..." : "Publicar"}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* AÇÕES */}
                        <td className="relative py-3 px-2 text-right whitespace-nowrap">
                          <details className="group/actions relative inline-block text-left">
                            <summary
                              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center text-lg font-bold text-gray-500 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange [&::-webkit-details-marker]:hidden"
                              aria-label={`Abrir ações de ${post.title}`}
                            >
                              ⋮
                            </summary>
                            <div className="absolute right-0 top-full z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#15161b] p-1.5 shadow-xl shadow-black/40">
                              <Link
                                href={`/admin/edit?id=${post.id}`}
                                className="flex min-h-11 items-center px-3 text-xs font-bold text-gray-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-brand-orange"
                              >
                                Editar matéria
                              </Link>
                              {post.is_published && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.currentTarget.closest("details")?.removeAttribute("open");
                                    void postPublishedArticleOnBrickboard(post);
                                  }}
                                  disabled={brickboardPostingId === post.id}
                                  className="flex min-h-11 w-full items-center px-3 text-left text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange/10 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange disabled:cursor-wait disabled:opacity-60"
                                >
                                  {brickboardPostingId === post.id ? "Publicando..." : "Publicar no Brickboard"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.currentTarget.closest("details")?.removeAttribute("open");
                                  setDeleteCandidate(post);
                                  setDeleteError(null);
                                }}
                                className="flex min-h-11 w-full items-center px-3 text-left text-xs font-bold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-400"
                              >
                                Excluir matéria
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* RODAPÉ DA TABELA */}
          <div className="flex flex-col gap-3 border-t border-white/10 p-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="shrink-0">Mostrando {totalPosts > 0 ? (currentPage - 1) * 20 + 1 : 0}–{Math.min(currentPage * 20, totalPosts)} de {totalPosts} matérias</span>
            <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="flex min-h-11 min-w-11 items-center justify-center rounded border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded font-bold transition-colors ${
                    currentPage === page ? "bg-brand-orange text-white" : "border border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
                className="flex min-h-11 min-w-11 items-center justify-center rounded border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
      </section>

      {publishCandidate && (
        <PublishConfirmModal
          title={publishCandidate.title}
          publishing={publishingId === publishCandidate.id}
          error={publishError}
          showCrossPost
          crossPost={publishOnBrickboard}
          onCrossPostChange={setPublishOnBrickboard}
          onConfirm={() => void publishPost(publishCandidate)}
          onCancel={() => {
            setPublishCandidate(null);
            setPublishOnBrickboard(false);
            setPublishError(null);
          }}
        />
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !deletingId && setDeleteCandidate(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
            className="w-full max-w-lg rounded-2xl border border-red-500/25 bg-[#0e0f14] p-6 shadow-2xl shadow-black/60"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-300" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
              </svg>
            </div>
            <h2 id="delete-confirmation-title" className="mt-5 font-heading text-xl font-black text-white">
              Excluir matéria?
            </h2>
            <p id="delete-confirmation-description" className="mt-2 text-sm leading-6 text-gray-300">
              {deleteCandidate.is_published
                ? "Esta matéria está publicada e será removida imediatamente do site."
                : "Este rascunho será removido do painel administrativo."} Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 rounded-xl bg-white/[0.04] p-4">
              <p className="text-xs font-bold text-gray-500">Matéria selecionada</p>
              <p className="mt-1.5 break-words font-heading text-sm font-bold uppercase leading-5 text-white">
                {deleteCandidate.title}
              </p>
            </div>
            {deleteError && (
              <div role="alert" className="mt-4 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteError(null);
                }}
                disabled={deletingId === deleteCandidate.id}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => void deletePost(deleteCandidate)}
                disabled={deletingId === deleteCandidate.id}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:cursor-wait disabled:opacity-60"
              >
                {deletingId === deleteCandidate.id ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </section>
        </div>
      )}

        {/* WIDGETS DA DIREITA */}
        <aside className="space-y-4">
          {/* PRIORIDADES DE HOJE */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Prioridades de hoje</h3>
              <span className="text-xs font-bold text-brand-orange">{recentDrafts.length} rascunhos</span>
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
                <span>Ver todos os rascunhos</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>

          {/* RITMO DA REDAÇÃO */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Ritmo da redação</h3>
              <span className="text-xs text-gray-500">Últimos 7 dias</span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black font-heading text-white">{weeklyPublished.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">publicações nesta semana</p>
            </div>
            {/* GRÁFICO DE BARRAS DA SEMANA */}
            <div className="mt-4 flex items-end justify-between gap-2 h-20 border-b border-white/10 pb-2">
              {weeklyRhythm.map((item) => (
                <div key={item.day} className="flex flex-col items-center flex-1 h-full justify-end">
                  <span className="text-xs font-bold text-gray-400 mb-1">{item.val}</span>
                  <div
                    style={{ height: `${weeklyPublished.length > 0 ? Math.max(8, (item.val / Math.max(...weeklyRhythm.map((day) => day.val), 1)) * 100) : 0}%` }}
                    className="w-full bg-brand-orange rounded-t-sm transition-all"
                  />
                  <span className="mt-1 text-xs font-semibold text-gray-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DISTRIBUIÇÃO EDITORIAL */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Distribuição editorial</h3>
              <span className="text-xs text-gray-500">Todas as matérias</span>
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
