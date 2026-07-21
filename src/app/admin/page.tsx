"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
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

function isAdmin(user: import("@supabase/supabase-js").User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

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

      if (!isAdmin(user)) {
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
    <div className="min-h-dvh bg-background-void text-white font-mono text-sm">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-lg font-black uppercase">
              Orange<span className="text-brand-orange">_</span>Brick <span className="text-xs text-gray-500 font-normal">/ painel</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors"
            >
              Ver site
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 cursor-pointer transition-all"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total</p>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-card-slate/40 border border-green-500/10 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Publicados</p>
            <p className="text-2xl font-black text-green-400">{stats.published}</p>
          </div>
          <div className="bg-card-slate/40 border border-yellow-500/10 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Rascunhos</p>
            <p className="text-2xl font-black text-yellow-400">{stats.drafts}</p>
          </div>
          <div className="bg-card-slate/40 border border-purple-500/10 rounded-xl p-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Categorias</p>
            <p className="text-2xl font-black text-purple-400">{Object.keys(stats.byCategory).length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(stats.byCategory).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-2 bg-card-slate/30 border border-brand-orange-muted/10 rounded-lg px-3 py-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">{cat}</span>
              <span className="text-xs font-bold text-white">{count}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-orange-muted/10">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">Suas Notícias</h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              {posts.length} postagen{posts.length !== 1 ? "ns" : "m"} no total
              {filterCategory !== "__all__" || filterStatus !== "all" || searchQuery
                ? ` (${filteredPosts.length} exibidas)`
                : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/edit")}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer text-xs"
          >
            + Nova Matéria
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título ou slug..."
              className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 pl-9 outline-none focus:border-brand-orange/50 transition-colors text-xs"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-500 uppercase tracking-wider">Categoria:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  filterCategory === cat.value
                    ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30"
                    : "bg-transparent text-gray-400 border-transparent hover:border-brand-orange-muted/20 hover:bg-card-slate/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-card-slate/40 border border-brand-orange-muted/10 rounded-lg p-0.5">
            {(["all", "published", "draft"] as const).map((s) => {
              const label = s === "all" ? "Tudo" : s === "published" ? "Publicado" : "Rascunho";
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    filterStatus === s
                      ? "bg-brand-orange/15 text-brand-orange"
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
          <div className="text-center py-20 border border-dashed border-brand-orange-muted/20 rounded-xl">
            <p className="text-gray-500 mb-4">
              {posts.length === 0
                ? "Nenhuma postagem encontrada."
                : "Nenhuma postagem corresponde aos filtros atuais."}
            </p>
            {posts.length === 0 && (
              <button
                onClick={() => router.push("/admin/edit")}
                className="text-xs text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors"
              >
                Escrever meu primeiro post
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-orange-muted/10 bg-card-slate/60 text-xs text-gray-400 uppercase">
                    <th className="py-4 px-6 font-bold w-14"></th>
                    <th className="py-4 px-6 font-bold">Título</th>
                    <th className="py-4 px-6 font-bold">Categoria</th>
                    <th className="py-4 px-6 font-bold">Status</th>
                    <th className="py-4 px-6 font-bold">Data</th>
                    <th className="py-4 px-6 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-brand-orange-muted/5 hover:bg-card-slate/20 transition-colors"
                    >
                      <td className="py-3 px-6">
                        {post.image_url ? (
                          <div className="w-12 h-8 rounded overflow-hidden border border-brand-orange-muted/10 flex-shrink-0">
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-8 rounded bg-card-slate flex items-center justify-center border border-brand-orange-muted/5">
                            <span className="text-[8px] text-gray-600">—</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 font-bold text-white max-w-xs truncate">
                        {post.title}
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-xs border border-white/10 px-2 py-0.5 rounded-md uppercase bg-white/5">
                          {post.category}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={togglingPublish === post.id}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md border transition-all cursor-pointer disabled:opacity-50 ${
                            post.is_published
                              ? "text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
                              : "text-yellow-400 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10"
                          }`}
                        >
                          {togglingPublish === post.id ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${post.is_published ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                          )}
                          {post.is_published ? "Publicado" : "Rascunho"}
                        </button>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(post.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-6 text-right space-x-3 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/posts/${post.slug}`)}
                          disabled={!post.is_published}
                          className="text-xs text-gray-400 hover:text-white cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => router.push(`/admin/edit?id=${post.id}`)}
                          className="text-xs text-brand-orange hover:text-white cursor-pointer font-bold transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="text-xs text-red-400 hover:text-red-300 cursor-pointer font-bold transition-colors"
                        >
                          Excluir
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-card-slate border border-brand-orange-muted/20 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-white mb-2 uppercase">Excluir postagem?</h3>
            <p className="text-xs font-mono text-gray-400 mb-6">Esta ação não pode ser desfeita.</p>

            {deleteError && (
              <p className="text-xs font-mono text-red-400 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null); }}
                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white border border-gray-500/20 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-xs font-mono text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors cursor-pointer font-bold"
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
