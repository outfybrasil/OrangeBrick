"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { ReelYouTubePublication } from "@/lib/types/database";

type Channel = { id: string; title: string; url: string };

export function YouTubePublisher({ postId, reelJobId, initialTitle, initialDescription, ready }: {
  postId: string; reelJobId?: string; initialTitle: string; initialDescription: string; ready: boolean;
}) {
  const supabase = useMemo(() => createDataClient(), []);
  const [title, setTitle] = useState(initialTitle.slice(0, 100));
  const [description, setDescription] = useState(initialDescription.slice(0, 5000));
  const [visibility, setVisibility] = useState<"private" | "unlisted" | "public">("private");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [publication, setPublication] = useState<ReelYouTubePublication | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada. Entre novamente no painel.");
    return session.access_token;
  }, [supabase]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reels/youtube?postId=${encodeURIComponent(postId)}`, {
        headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar o YouTube.");
      if (signal?.aborted) return;
      setChannel(data.channel);
      setPublication(data.publication);
      setError(null);
    } catch (error) {
      if (!signal?.aborted) {
        setChannel(null);
        setError(error instanceof Error ? error.message : "Não foi possível consultar o YouTube.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void refresh(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [refresh]);

  useEffect(() => {
    if (!publication || !["preparing", "uploading"].includes(publication.status)) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(controller.signal); }, 15_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [publication, refresh]);

  const blocked = publication && publication.status !== "failed";
  const busy = sending || publication?.status === "preparing" || publication?.status === "uploading";
  const fieldClass = "mt-1 w-full rounded-lg border border-white/20 bg-[#07080c] px-3 py-2 text-base text-white focus-visible:outline-2 focus-visible:outline-brand-orange sm:text-sm disabled:opacity-60";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!channel || sending || blocked || !confirmed) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reels/youtube", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reelJobId, channelId: channel.id, title, description, visibility, confirmed }),
        signal: AbortSignal.timeout(295_000),
      });
      const data = await response.json().catch(() => null);
      if (data?.publication) setPublication(data.publication);
      if (!response.ok) throw new Error(data?.error || "O servidor não confirmou o envio. Atualize o histórico antes de tentar novamente.");
      if (!data?.publication) throw new Error("O servidor não confirmou o resultado. Atualize o histórico.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Conexão interrompida. Atualize o histórico antes de tentar novamente.";
      await refresh();
      setError(message);
    } finally {
      setSending(false);
      setConfirmed(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="font-bold text-white">Enviar para o YouTube</p>
          {channel && <a href={channel.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 underline underline-offset-4">{channel.title}</a>}
          {loading && <p role="status" className="text-gray-300">Consultando conexão e histórico…</p>}
        </div>
        <button type="button" disabled={loading || sending} onClick={() => void refresh()} className="min-h-11 px-3 text-sm text-gray-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-50">Atualizar conexão</button>
      </div>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {publication?.status === "uploaded" ? (
        <div role="status" className="space-y-2 text-gray-200">
          <p className="font-bold text-emerald-300">Vídeo recebido pelo YouTube.</p>
          <p>O processamento e a visibilidade final podem ser acompanhados no YouTube Studio.</p>
          {publication.video_id && <a className="inline-flex min-h-11 items-center text-brand-orange underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/watch?v=${publication.video_id}`}>Abrir vídeo no YouTube</a>}
        </div>
      ) : blocked ? (
        <div role="status" className="space-y-2 text-gray-200">
          <p>{publication.status === "unknown" ? "O resultado do envio precisa ser conferido no YouTube Studio." : "Envio registrado. Aguarde a confirmação e atualize o histórico."}</p>
          <p>Um novo envio está bloqueado para evitar vídeos duplicados.</p>
        </div>
      ) : (
        <>
          <label className="block text-gray-200">Título <span className="text-gray-400">({title.length}/100)</span>
            <input required maxLength={100} value={title} disabled={sending} onChange={event => { setTitle(event.target.value); setConfirmed(false); }} className={fieldClass} />
          </label>
          <label className="block text-gray-200">Descrição
            <textarea rows={5} maxLength={5000} value={description} disabled={sending} onChange={event => { setDescription(event.target.value); setConfirmed(false); }} className={fieldClass} />
          </label>
          <label className="block text-gray-200">Visibilidade
            <select value={visibility} disabled={sending} onChange={event => { setVisibility(event.target.value as typeof visibility); setConfirmed(false); }} className={fieldClass}>
              <option value="private">Privado — revisar no YouTube Studio</option>
              <option value="unlisted">Não listado — acessível pelo link</option>
              <option value="public">Público — publicar no canal</option>
            </select>
          </label>
          <label className="flex min-h-11 items-start gap-3 text-gray-200">
            <input type="checkbox" checked={confirmed} disabled={sending || !channel} onChange={event => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand-orange" />
            <span>Revisei o vídeo e os textos. Confirmo o envio {visibility === "public" ? "público" : visibility === "unlisted" ? "não listado" : "privado"} para {channel?.title || "o canal conectado"}.</span>
          </label>
          <button type="submit" disabled={!ready || !reelJobId || !channel || loading || sending || !confirmed || !title.trim()} className="min-h-11 w-full rounded-lg bg-brand-orange px-4 py-3 font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? "Enviando vídeo…" : publication?.status === "failed" ? "Tentar novamente só no YouTube" : visibility === "public" ? "Publicar no YouTube" : "Enviar para o YouTube"}
          </button>
          {!ready && <p className="text-gray-300">Aguarde a geração do Reel terminar.</p>}
          {ready && !reelJobId && <p className="text-gray-300">Gere este Reel no site publicado para enviá-lo pelo painel.</p>}
          {busy && <p role="status" className="text-gray-300">O envio pode levar alguns minutos. O histórico permanece salvo se você fechar esta janela.</p>}
        </>
      )}
      <a href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-gray-300 underline underline-offset-4">Abrir YouTube Studio</a>
    </form>
  );
}
