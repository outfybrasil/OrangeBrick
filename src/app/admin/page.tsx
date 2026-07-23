"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
import { isAdminUser } from "@/lib/auth";
import type { Post, PostCategory } from "@/lib/types/database";

const CATEGORIES: { value: PostCategory | "__all__"; label: string }[] = [
  { value: "__all__", label: "Todas" },
  { value: "breaking", label: "Breaking" },
  { value: "industry", label: "Indústria" },
  { value: "hardware", label: "Hardware" },
  { value: "review", label: "Review" },
  { value: "opinion", label: "Opinião" },
  { value: "modding", label: "Modding" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminDashboard() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingPublish, setTogglingPublish] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<PostCategory | "__all__">("__all__");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");

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
        .order("created_at", { ascending: false })
        .returns<Post[]>();

      if (fetchError) throw fetchError;

      setPosts((data as Post[]) || []);
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro desconhecido"));
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void checkAdminAndFetchPosts());
  }, [checkAdminAndFetchPosts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterCategory !== "__all__" && p.category !== filterCategory) return false;
      if (filterStatus === "published" && !p.is_published) return false;
      if (filterStatus === "draft" && p.is_published) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSlug = p.slug.toLowerCase().includes(q);
        if (!matchTitle && !matchSlug) return false;
      }
      return true;
    });
  }, [posts, filterCategory, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.is_published).length;
    const drafts = total - published;
    const byCategory = posts.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { total, published, drafts, byCategory };
  }, [posts]);

  const handleDelete = async (id: string) => {
    try {
      setDeleteError(null);

      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setPosts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setDeleteError(errorMessage(err, "Erro ao excluir"));
    }
  };

  const handleTogglePublish = async (post: Post) => {
    setTogglingPublish(post.id);
    try {
      const newPublished = !post.is_published;
      if (newPublished) {
        let blocks: EditorialBlock[] = [];
        try {
          const parsed: unknown = JSON.parse(post.body);
          if (Array.isArray(parsed)) blocks = parsed as EditorialBlock[];
        } catch {
          blocks = [];
        }
        const editorialErrors = validateEditorialContent({
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          imageUrl: post.image_url || "",
          imageAlt: post.image_alt || "",
          blocks,
        });
        if (editorialErrors.length > 0) {
          setError(editorialErrors.join(" "));
          return;
        }
      }
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          is_published: newPublished,
          published_at: newPublished ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (updateError) throw updateError;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, is_published: newPublished, published_at: newPublished ? new Date().toISOString() : null }
            : p
        )
      );

      if (newPublished) {
        const payload = { title: post.title, slug: post.slug, category: post.category };
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
          await invokeFunction("send-push-notification", {
            title: `🧱 ${payload.title}`,
            body: `Nova matéria publicada na categoria ${payload.category}`,
            url: `${siteUrl}/posts/${payload.slug}`,
          }, { accessToken: session.access_token });
        }
      }
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro ao alterar publicação"));
    } finally {
      setTogglingPublish(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-gray-400">Verificando sessão e carregando posts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-void text-white font-body text-sm">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-8 sm:h-9 w-auto max-h-9 object-contain shrink-0" />
            <h1 className="text-sm sm:text-xl font-heading font-extrabold uppercase truncate flex items-center gap-3">
              <span>Orange<span className="text-brand-orange">_</span>Brick</span>
              <span className="hidden sm:inline-flex items-center text-[10px] sm:text-xs text-brand-orange font-subtitle font-bold uppercase tracking-wider bg-brand-orange/10 px-2.5 py-1 rounded-lg border border-brand-orange/30 ml-2 shadow-sm">
                Painel Admin
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => router.push("/")}
              className="text-[10px] sm:text-xs font-subtitle text-gray-300 hover:text-white cursor-pointer transition-colors bg-card-slate/50 px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-brand-orange-muted/15 whitespace-nowrap flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Ver Site</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] sm:text-xs font-subtitle text-red-400 hover:text-red-300 border border-red-500/20 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-all whitespace-nowrap"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-subtitle text-xs">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl p-5">
            <p className="text-[10px] font-subtitle uppercase tracking-wider text-gray-400 mb-1">Total de Matérias</p>
            <p className="text-3xl font-heading font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-card-slate/40 border border-green-500/20 rounded-xl p-5">
            <p className="text-[10px] font-subtitle uppercase tracking-wider text-gray-400 mb-1">Publicadas no Site</p>
            <p className="text-3xl font-heading font-black text-green-400">{stats.published}</p>
          </div>
          <div className="bg-card-slate/40 border border-yellow-500/20 rounded-xl p-5">
            <p className="text-[10px] font-subtitle uppercase tracking-wider text-gray-400 mb-1">Rascunhos (Em Revisão)</p>
            <p className="text-3xl font-heading font-black text-yellow-400">{stats.drafts}</p>
          </div>
          <div className="bg-card-slate/40 border border-sky-500/20 rounded-xl p-5">
            <p className="text-[10px] font-subtitle uppercase tracking-wider text-gray-400 mb-1">Categorias Ativas</p>
            <p className="text-3xl font-heading font-black text-sky-400">{Object.keys(stats.byCategory).length}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-brand-orange-muted/10">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-heading font-bold uppercase tracking-tight text-white truncate">Matérias & Rascunhos</h2>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 font-body">
              {posts.length} postagen{posts.length !== 1 ? "ns" : "m"} cadastradas
              {filterCategory !== "__all__" || filterStatus !== "all" || searchQuery
                ? ` (${filteredPosts.length} exibidas)`
                : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/edit")}
            className="shrink-0 bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(255,94,0,0.35)] transition-all cursor-pointer text-[10px] sm:text-xs uppercase tracking-wider whitespace-nowrap"
          >
            + Nova Matéria
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título ou slug..."
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 pl-8 sm:pl-9 outline-none focus:border-brand-orange/50 transition-colors text-[11px] sm:text-xs font-body"
            />
            <svg className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-subtitle text-[10px] sm:text-xs w-full sm:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  filterCategory === cat.value
                    ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30 font-bold"
                    : "bg-transparent text-gray-400 border-transparent hover:border-brand-orange-muted/20 hover:bg-card-slate/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-card-slate/40 border border-brand-orange-muted/10 rounded-lg p-0.5 shrink-0 font-subtitle text-[10px] sm:text-xs">
            {(["all", "published", "draft"] as const).map((s) => {
              const label = s === "all" ? "Tudo" : s === "published" ? "Publicados" : "Rascunhos";
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                    filterStatus === s
                      ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-brand-orange-muted/20 rounded-xl font-subtitle">
            <p className="text-gray-400 mb-4">
              {posts.length === 0
                ? "Nenhuma postagem encontrada."
                : "Nenhuma postagem corresponde aos filtros atuais."}
            </p>
            {posts.length === 0 && (
              <button
                onClick={() => router.push("/admin/edit")}
                className="text-xs font-subtitle font-bold text-brand-orange hover:text-white border border-brand-orange/30 px-5 py-2.5 rounded-xl hover:bg-brand-orange/10 transition-colors"
              >
                Escrever primeira matéria
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-orange-muted/10 bg-card-slate/60 text-[10px] sm:text-xs font-subtitle text-gray-400 uppercase tracking-wider">
                    <th className="py-3 sm:py-4 px-3 sm:px-6 font-bold w-12 sm:w-16">Mídia</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-6 font-bold">Título</th>
                    <th className="hidden sm:table-cell py-3 sm:py-4 px-3 sm:px-6 font-bold">Categoria</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-6 font-bold">Status</th>
                    <th className="hidden sm:table-cell py-3 sm:py-4 px-3 sm:px-6 font-bold">Data</th>
                    <th className="py-3 sm:py-4 px-3 sm:px-6 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-orange-muted/5 font-body">
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="hover:bg-card-slate/30 transition-colors"
                    >
                      <td className="py-2 sm:py-3 px-3 sm:px-6">
                        {post.image_url ? (
                          <div className="w-10 sm:w-12 h-8 sm:h-9 rounded-lg overflow-hidden border border-brand-orange-muted/10 shrink-0">
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 sm:w-12 h-8 sm:h-9 rounded-lg bg-card-slate flex items-center justify-center border border-brand-orange-muted/5 text-[8px] sm:text-[9px] text-gray-500">
                            Sem foto
                          </div>
                        )}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-6 font-bold text-white max-w-[120px] sm:max-w-sm truncate text-[11px] sm:text-sm">
                        {post.title}
                      </td>
                      <td className="hidden sm:table-cell py-2 sm:py-3 px-3 sm:px-6">
                        <span className="text-[10px] sm:text-[11px] font-subtitle font-bold border border-brand-orange-muted/20 px-2 sm:px-2.5 py-0.5 rounded-md uppercase bg-brand-orange/5 text-brand-orange">
                          {post.category}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-6">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={togglingPublish === post.id}
                          className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-subtitle font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                            post.is_published
                              ? "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20"
                              : "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20"
                          }`}
                        >
                          {togglingPublish === post.id ? (
                            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${post.is_published ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
                          )}
                          <span className="hidden xs:inline">{post.is_published ? "Publicado" : "Rascunho"}</span>
                        </button>
                      </td>
                      <td className="hidden sm:table-cell py-2 sm:py-3 px-3 sm:px-6 text-[11px] sm:text-xs text-gray-400 whitespace-nowrap font-subtitle">
                        {new Date(post.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-6 text-right space-x-1.5 sm:space-x-3 whitespace-nowrap font-subtitle text-[10px] sm:text-xs">
                        <button
                          onClick={() => window.open(`/posts/${post.slug}`, "_blank")}
                          className="text-gray-400 hover:text-white cursor-pointer transition-colors p-1"
                          title="Visualizar no site"
                        >
                          <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/admin/edit?id=${post.id}`)}
                          className="text-brand-orange hover:text-white cursor-pointer font-bold transition-colors p-1"
                          title="Editar matéria"
                        >
                          <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="text-red-400 hover:text-red-300 cursor-pointer font-bold transition-colors p-1"
                          title="Excluir matéria"
                        >
                          <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
          <div className="bg-card-slate border border-brand-orange-muted/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold font-heading text-white mb-2 uppercase">Excluir postagem?</h3>
            <p className="text-xs font-body text-gray-400 mb-6">Esta ação apagará a matéria permanentemente.</p>

            {deleteError && (
              <p className="text-xs font-body text-red-400 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 font-subtitle text-xs">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                className="px-4 py-2 text-gray-300 hover:text-white border border-gray-500/20 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors cursor-pointer font-bold shadow-md"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
