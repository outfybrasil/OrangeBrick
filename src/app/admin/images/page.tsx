"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import type { EditorialImage } from "@/lib/types/database";

interface LibraryImage extends EditorialImage {
  post: { id: string; title: string; slug: string } | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminImagesPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isAdminUser(session.user)) throw new Error("Acesso negado");
      const response = await fetch("/api/admin/images", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao carregar a biblioteca");
      setImages(payload.images as LibraryImage[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar a biblioteca");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadImages());
  }, [loadImages]);

  return (
    <AdminShell
      active="images"
      title="Biblioteca de imagens"
      description="Arquivos padronizados, origem, tamanho e vínculo editorial em um só lugar."
      actions={(
        <Link
          href="/admin/edit"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-brand-orange/90"
        >
          Nova matéria
        </Link>
      )}
      wide
    >
      {error && (
        <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => void loadImages()} className="min-h-11 rounded-xl px-3 font-bold hover:bg-red-500/10">
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2" aria-label="Carregando biblioteca">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="border-t border-white/[0.08] py-14 text-center">
          <h2 className="text-lg font-bold text-white">Nenhuma imagem processada</h2>
          <p className="mt-2 text-sm text-gray-400">Abra uma matéria e use “Baixar e padronizar”.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.08]">
          <div className="hidden grid-cols-[112px_minmax(220px,1fr)_minmax(220px,1fr)_120px_150px] gap-4 border-b border-white/[0.08] bg-white/[0.025] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-500 md:grid">
            <span>Imagem</span>
            <span>Origem</span>
            <span>Matéria vinculada</span>
            <span>Arquivo</span>
            <span>Data</span>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {images.map((image) => (
              <article key={image.id} className="grid gap-3 p-4 md:grid-cols-[112px_minmax(220px,1fr)_minmax(220px,1fr)_120px_150px] md:items-center md:gap-4">
                <a href={image.public_url} target="_blank" rel="noreferrer" className="block aspect-video w-28 overflow-hidden rounded-lg bg-[#08090C]">
                  <img src={image.public_url} alt={image.alt_text || ""} className="h-full w-full object-contain" />
                </a>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-500 md:hidden">Origem</p>
                  <a href={image.source_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-gray-300 hover:text-brand-orange md:mt-0">
                    {image.source_url}
                  </a>
                  <p className="mt-1 text-[10px] text-gray-500">{image.kind === "cover" ? "Capa" : image.kind === "body" ? "Corpo" : "Lançamento"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase text-gray-500 md:hidden">Matéria</p>
                  {image.post ? (
                    <Link href={`/admin/edit?id=${image.post.id}`} className="mt-1 block truncate text-sm font-semibold text-white hover:text-brand-orange md:mt-0">
                      {image.post.title}
                    </Link>
                  ) : (
                    <span className="mt-1 block text-sm text-amber-300 md:mt-0">Não vinculada</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500 md:hidden">Arquivo</p>
                  <p className="mt-1 text-xs text-gray-300 md:mt-0">1280 × 720</p>
                  <p className="mt-1 text-[10px] text-gray-500">WebP · {formatBytes(image.file_size)}</p>
                </div>
                <time className="text-xs text-gray-400" dateTime={image.created_at}>
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(image.created_at))}
                </time>
              </article>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
