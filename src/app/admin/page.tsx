"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types/database";

export default function AdminDashboard() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const checkAdminAndFetchPosts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Verificar autenticação via check-session seguro no servidor
      const sessionRes = await fetch("/api/admin/check-session");
      const sessionData = await sessionRes.json();

      if (!sessionData.isAdmin) {
        router.push("/admin/login");
        return;
      }

      // 2. Chamar nossa API segura do admin
      const res = await fetch("/api/admin/posts");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao buscar postagens");
      }

      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAndFetchPosts();
  }, [router]);

  const handleDelete = async (id: string) => {
    try {
      setDeleteError(null);
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir");
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err.message);
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
      {/* Header Admin */}
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8 pb-4 border-b border-brand-orange-muted/10">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">Suas Notícias</h2>
            <p className="text-xs text-gray-500 mt-1 font-sans">Gerencie, edite rascunhos ou publique novas matérias.</p>
          </div>
          <button
            onClick={() => router.push("/admin/edit")}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-4 py-2.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer text-xs"
          >
            + Nova Matéria
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-brand-orange-muted/20 rounded-xl">
            <p className="text-gray-500 mb-4">Nenhuma postagem encontrada.</p>
            <button
              onClick={() => router.push("/admin/edit")}
              className="text-xs text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors"
            >
              Escrever meu primeiro post
            </button>
          </div>
        ) : (
          <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-orange-muted/10 bg-card-slate/60 text-xs text-gray-400 uppercase">
                    <th className="py-4 px-6 font-bold">Título</th>
                    <th className="py-4 px-6 font-bold">Categoria</th>
                    <th className="py-4 px-6 font-bold">Status</th>
                    <th className="py-4 px-6 font-bold">Data</th>
                    <th className="py-4 px-6 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-brand-orange-muted/5 hover:bg-card-slate/20 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-white max-w-sm truncate">
                        {post.title}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs border border-white/10 px-2 py-0.5 rounded-md uppercase bg-white/5">
                          {post.category}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {post.is_published ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-green-400 border border-green-500/20 px-2.5 py-0.5 rounded-md bg-green-500/5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded-md bg-yellow-500/5">
                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                            Rascunho
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {new Date(post.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
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
