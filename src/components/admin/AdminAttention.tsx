"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AttentionItem } from "@/lib/admin-attention";

type Attention = { items: AttentionItem[]; warnings: string[]; checkedAt: string; scanned: number; total: number };
const labels = { image: "Imagens", review: "Revisões", video: "Vídeos", publication: "Envios" };

export function AdminAttention() {
  const [data, setData] = useState<Attention | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<AttentionItem["kind"] | "all">("all");
  const load = useCallback(async (scan: boolean, signal?: AbortSignal) => {
    setLoading(true);
    setScanning(scan);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Entre novamente para consultar as pendências.");
      const response = await fetch(`/api/admin/attention${scan ? "?images=1" : ""}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar as pendências.");
      if (!signal?.aborted) setData(result);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as pendências.");
    } finally {
      if (!signal?.aborted) { setLoading(false); setScanning(false); }
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void load(false, controller.signal); });
    return () => controller.abort();
  }, [load]);
  const items = data?.items.filter(item => filter === "all" || item.kind === filter) || [];
  return (
    <section aria-labelledby="admin-attention-title" className="mb-6 rounded-xl border border-amber-400/20 bg-[#0e0f14] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="admin-attention-title" className="font-heading text-lg font-bold text-white">Precisa de atenção</h2><p className="mt-1 text-xs leading-5 text-gray-400">Imagens, revisões e vídeos das últimas {data?.total ?? 50} matérias atualizadas. Itens publicados com problemas de imagem aparecem primeiro.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/publicacoes" className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-3 text-xs font-bold">Ver publicações</Link><button type="button" disabled={loading} onClick={() => void load(false)} className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-bold disabled:opacity-50">Atualizar</button><button type="button" disabled={loading} onClick={() => void load(true)} className="min-h-11 rounded-lg border border-brand-orange/40 px-3 text-xs font-bold text-brand-orange disabled:opacity-50">{scanning ? "Conferindo imagens…" : "Verificar imagens"}</button></div></div>
      <p className="mt-3 text-xs leading-5 text-gray-500">A lista confere os campos e as regras das imagens. “Verificar imagens” também testa disponibilidade e resolução nas 6 matérias atualizadas mais recentemente. A checagem pode levar até um minuto e não altera ou publica matérias.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {loading && <p role="status" className="mt-3 text-sm text-gray-400">{scanning ? "Conferindo arquivos e regras editoriais…" : "Atualizando pendências…"}</p>}
      {data && <><div role="group" aria-label="Filtrar pendências" className="mt-4 flex flex-wrap gap-2">{(["all", "image", "review", "video", "publication"] as const).map(kind => <button key={kind} type="button" aria-pressed={filter === kind} onClick={() => setFilter(kind)} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${filter === kind ? "border-brand-orange text-brand-orange" : "border-white/10 text-gray-400"}`}>{kind === "all" ? "Tudo" : labels[kind]} ({data.items.filter(item => kind === "all" || item.kind === kind).length})</button>)}</div>
      {data.warnings.map(message => <p key={message} role="alert" className="mt-3 text-xs text-amber-300">{message}</p>)}
      <div className="mt-3 max-h-96 divide-y divide-white/10 overflow-y-auto">{items.length === 0 ? <p className="py-4 text-sm text-gray-400">Nenhuma pendência encontrada neste recorte{data.warnings.length ? "; algumas consultas estão indisponíveis" : ""}.</p> : items.map(item => <Link key={item.id} href={item.href} className="block rounded-lg py-3 pr-2 hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-brand-orange"><p className={`text-xs font-bold ${item.urgent ? "text-red-300" : "text-amber-300"}`}>{labels[item.kind]}{item.urgent ? " · Conferir" : ""}</p><p className="mt-1 break-words text-sm font-semibold text-white">{item.title}</p><p className="mt-1 break-words text-xs leading-5 text-gray-400">{item.message}</p><span className="mt-2 inline-block text-xs font-bold text-brand-orange">{item.kind === "image" || item.kind === "review" ? "Abrir matéria →" : "Abrir Reels →"}</span></Link>)}</div>
      <p className="mt-3 text-xs text-gray-500">Consulta: {new Date(data.checkedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília). {data.scanned ? `Arquivos conferidos em ${data.scanned} matérias.` : "Disponibilidade dos arquivos ainda não testada nesta consulta."}</p></>}
    </section>
  );
}
