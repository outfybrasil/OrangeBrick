"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
import { invokeFunction } from "@/lib/supabase/functions";
import { createDataClient } from "@/lib/supabase/client";
import type { Post, PostCategory } from "@/lib/types/database";

type StatusFilter = "all" | "published" | "draft";
type SortOrder = "updated" | "created" | "title";

const CATEGORY_LABELS: Record<PostCategory, string> = {
  breaking: "Breaking",
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

function parseBlocks(body: string): EditorialBlock[] {
  try {
    const parsed: unknown = JSON.parse(body);
    return Array.isArray(parsed) ? parsed as EditorialBlock[] : [];
  } catch {
    return [];
  }
}

function editorialIssues(post: Post) {
  return validateEditorialContent({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    imageUrl: post.image_url || "",
    imageAlt: post.image_alt || "",
    blocks: parseBlocks(post.body),
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="m14 5 5 5M4 20l4.5-1L19 8.5a2.1 2.1 0 0 0-3-3L5.5 16z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M14 5h5v5M19 5l-9 9" />
      <path d="M18 13v6H5V6h6" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<PostCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("updated");

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

  const postReadiness = useMemo(
    () => new Map(posts.map((post) => [post.id, editorialIssues(post)])),
    [posts],
  );

  const drafts = useMemo(() => posts.filter((post) => !post.is_published), [posts]);
  const readyDrafts = useMemo(
    () => drafts.filter((post) => (postReadiness.get(post.id)?.length || 0) === 0),
    [drafts, postReadiness],
  );

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
    return posts
      .filter((post) => {
        if (filterCategory !== "all" && post.category !== filterCategory) return false;
        if (filterStatus === "published" && !post.is_published) return false;
        if (filterStatus === "draft" && post.is_published) return false;
        if (!query) return true;
        return [post.title, post.slug, post.author_name]
          .some((value) => value.toLocaleLowerCase("pt-BR").includes(query));
      })
      .sort((a, b) => {
        if (sortOrder === "title") return a.title.localeCompare(b.title, "pt-BR");
        const key = sortOrder === "created" ? "created_at" : "updated_at";
        return new Date(b[key]).getTime() - new Date(a[key]).getTime();
      });
  }, [filterCategory, filterStatus, posts, searchQuery, sortOrder]);

  const categoryCounts = useMemo(
    () => posts.reduce<Record<PostCategory, number>>((counts, post) => {
      counts[post.category] += 1;
      return counts;
    }, { breaking: 0, industry: 0, hardware: 0, review: 0, opinion: 0, modding: 0 }),
    [posts],
  );

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      setDeleteError(null);
      const { error: removeError } = await supabase.from("posts").delete().eq("id", id);
      if (removeError) throw removeError;
      setPosts((current) => current.filter((post) => post.id !== id));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setDeleteError(errorMessage(err, "Não foi possível excluir a matéria. Tente novamente."));
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (post: Post) => {
    const nextPublished = !post.is_published;
    setTogglingPublish(post.id);
    setError(null);

    try {
      if (nextPublished) {
        const issues = postReadiness.get(post.id) || [];
        if (issues.length > 0) {
          setError(`Revise “${post.title}” antes de publicar: ${issues.join(" ")}`);
          return;
        }
      }

      const nextPublishedAt = nextPublished ? new Date().toISOString() : null;
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          is_published: nextPublished,
          published_at: nextPublishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      setPosts((current) => current.map((item) =>
        item.id === post.id
          ? { ...item, is_published: nextPublished, published_at: nextPublishedAt, updated_at: new Date().toISOString() }
          : item
      ));

      if (nextPublished) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
            await invokeFunction("send-push-notification", {
              title: `🧱 ${post.title}`,
              body: `Nova matéria em ${CATEGORY_LABELS[post.category]}`,
              url: `${siteUrl}/posts/${post.slug}`,
            }, { accessToken: session.access_token });
          }
        } catch {
          setError("A matéria foi publicada, mas a notificação push não pôde ser enviada.");
        }
      }
    } catch (err: unknown) {
      setError(errorMessage(err, "Não foi possível alterar o status da matéria."));
    } finally {
      setTogglingPublish(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background-void px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
          <p className="text-sm text-gray-400">Preparando a mesa de redação...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      active="overview"
      title="Visão geral"
      description="Acompanhe o que está publicado, encontre pendências e mova cada matéria para a próxima etapa."
      status={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Dados sincronizados
        </span>
      }
      actions={
        <Link
          href="/admin/edit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-[#ff7122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Nova matéria
        </Link>
      }
      wide
    >
      {error && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="min-h-7 shrink-0 font-bold text-red-300 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      <section aria-label="Resumo editorial" className="mb-6 overflow-hidden rounded-2xl bg-[#15161d]">
        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.07] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-500">Acervo editorial</p>
            <p className="mt-2 font-heading text-3xl font-black tracking-[-0.03em]">{posts.length}</p>
            <p className="mt-1 text-xs text-gray-500">matérias cadastradas</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-500">No ar</p>
            <p className="mt-2 font-heading text-3xl font-black tracking-[-0.03em] text-emerald-300">
              {posts.length - drafts.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">visíveis no site</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-500">Em rascunho</p>
            <p className="mt-2 font-heading text-3xl font-black tracking-[-0.03em] text-amber-300">{drafts.length}</p>
            <p className="mt-1 text-xs text-gray-500">aguardando revisão</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-500">Prontas</p>
            <p className="mt-2 font-heading text-3xl font-black tracking-[-0.03em] text-brand-orange">{readyDrafts.length}</p>
            <p className="mt-1 text-xs text-gray-500">sem pendências técnicas</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0" aria-labelledby="content-queue-title">
          <div className="rounded-2xl bg-[#15161d]">
            <div className="border-b border-white/[0.07] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="content-queue-title" className="font-heading text-xl font-extrabold">Fila editorial</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {filteredPosts.length} de {posts.length} matérias
                  </p>
                </div>
                <div role="group" aria-label="Filtrar por status" className="grid grid-cols-3 rounded-xl bg-background-void p-1">
                  {([
                    ["all", "Todas"],
                    ["draft", "Rascunhos"],
                    ["published", "No ar"],
                  ] as [StatusFilter, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterStatus(value)}
                      aria-pressed={filterStatus === value}
                      className={`min-h-11 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange ${
                        filterStatus === value ? "bg-white/[0.09] text-white" : "text-gray-500 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_170px]">
                <label className="relative block">
                  <span className="sr-only">Buscar matérias</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Título, slug ou autor"
                    className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-background-void pl-10 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-brand-orange/60 focus:ring-1 focus:ring-brand-orange/25"
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrar por categoria</span>
                  <select
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value as PostCategory | "all")}
                    className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-background-void px-3 text-sm text-gray-300 outline-none focus:border-brand-orange/60"
                  >
                    <option value="all">Todas as categorias</option>
                    {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Ordenar matérias</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-background-void px-3 text-sm text-gray-300 outline-none focus:border-brand-orange/60"
                  >
                    <option value="updated">Atualizadas agora</option>
                    <option value="created">Criadas agora</option>
                    <option value="title">Título A–Z</option>
                  </select>
                </label>
              </div>
            </div>

            {deleteError && (
              <div role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:px-5">
                {deleteError}
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="font-heading text-lg font-bold text-white">
                  {posts.length === 0 ? "A redação ainda está vazia" : "Nenhuma matéria encontrada"}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  {posts.length === 0
                    ? "Crie a primeira matéria e salve como rascunho para iniciar o fluxo editorial."
                    : "Ajuste a busca ou remova um dos filtros para ampliar os resultados."}
                </p>
                {posts.length === 0 && (
                  <Link href="/admin/edit" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold">
                    Criar primeira matéria
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {filteredPosts.map((post) => {
                  const issues = postReadiness.get(post.id) || [];
                  const isConfirmingDelete = deleteConfirm === post.id;
                  return (
                    <article key={post.id} className="p-4 transition-colors hover:bg-white/[0.018] sm:p-5">
                      <div className="grid min-w-0 gap-4 sm:grid-cols-[96px_minmax(0,1fr)] 2xl:grid-cols-[96px_minmax(0,1fr)_auto] 2xl:items-center">
                        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-background-void">
                          {post.image_url ? (
                            <img src={post.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold text-gray-600">
                              Sem capa
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-brand-orange">{CATEGORY_LABELS[post.category]}</span>
                            <span className="text-[11px] text-gray-600">•</span>
                            <span className="text-[11px] text-gray-500">Atualizada em {formatDate(post.updated_at)}</span>
                          </div>
                          <h3 className="line-clamp-2 font-heading text-base font-extrabold leading-5 text-white sm:text-lg">
                            {post.title}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(post)}
                              disabled={togglingPublish === post.id}
                              aria-label={post.is_published ? `Retirar ${post.title} do ar` : `Publicar ${post.title}`}
                              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                                post.is_published
                                  ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                                  : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                              }`}
                            >
                              {togglingPublish === post.id ? <Spinner /> : <span className={`h-1.5 w-1.5 rounded-full ${post.is_published ? "bg-emerald-400" : "bg-amber-400"}`} />}
                              {post.is_published ? "No ar" : "Rascunho"}
                            </button>
                            {!post.is_published && (
                              <span className={`text-xs ${issues.length === 0 ? "text-emerald-300" : "text-gray-500"}`}>
                                {issues.length === 0 ? "Pronta para publicar" : `${issues.length} pendência${issues.length === 1 ? "" : "s"}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:col-start-2 2xl:col-start-auto">
                          <Link
                            href={`/admin/edit?id=${post.id}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/[0.06] px-3 text-xs font-bold text-gray-200 transition-colors hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-brand-orange"
                          >
                            <EditIcon />
                            Editar
                          </Link>
                          {post.is_published && (
                            <Link
                              href={`/posts/${post.slug}`}
                              target="_blank"
                              aria-label={`Abrir ${post.title} no site`}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
                            >
                              <ExternalIcon />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirm(post.id);
                              setDeleteError(null);
                            }}
                            aria-label={`Excluir ${post.title}`}
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-red-300/50 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-400"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>

                      {isConfirmingDelete && (
                        <div className="mt-4 rounded-xl bg-red-500/10 p-3 sm:ml-28">
                          <p className="text-sm font-semibold text-red-100">Excluir esta matéria permanentemente?</p>
                          <p className="mt-1 text-xs leading-5 text-red-200/70">Essa ação remove o conteúdo do painel e não pode ser desfeita.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(post.id)}
                              disabled={deleting === post.id}
                              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-500 px-3 text-xs font-bold text-white disabled:opacity-60"
                            >
                              {deleting === post.id && <Spinner />}
                              Excluir matéria
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="min-h-11 rounded-xl px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.06]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="review-title" className="rounded-2xl bg-[#15161d] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="review-title" className="font-heading text-lg font-extrabold">Próximos passos</h2>
              <span className="text-xs font-bold text-amber-300">{drafts.length} em revisão</span>
            </div>

            {drafts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-white">Fila limpa</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">Não há rascunhos aguardando trabalho.</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-white/[0.07]">
                {drafts.slice(0, 5).map((post) => {
                  const issues = postReadiness.get(post.id) || [];
                  return (
                    <Link
                      key={post.id}
                      href={`/admin/edit?id=${post.id}`}
                      className="group block py-3 focus-visible:outline-2 focus-visible:outline-brand-orange"
                    >
                      <p className="line-clamp-2 text-sm font-bold leading-5 text-gray-200 transition-colors group-hover:text-white">{post.title}</p>
                      <p className={`mt-1 text-xs ${issues.length === 0 ? "text-emerald-300" : "text-gray-500"}`}>
                        {issues.length === 0 ? "Pronta para publicação" : `${issues.length} ponto${issues.length === 1 ? "" : "s"} para revisar`}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="categories-title" className="rounded-2xl bg-[#15161d] p-5">
            <h2 id="categories-title" className="font-heading text-lg font-extrabold">Distribuição</h2>
            <p className="mt-1 text-xs text-gray-500">Conteúdo por categoria</p>
            <div className="mt-5 space-y-4">
              {CATEGORY_OPTIONS.map(([category, label]) => {
                const count = categoryCounts[category];
                const width = posts.length === 0 ? 0 : Math.max((count / posts.length) * 100, count > 0 ? 6 : 0);
                return (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300">{label}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background-void">
                      <div className="h-full rounded-full bg-brand-orange" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
