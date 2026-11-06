"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { instagramPostCaption } from "@/lib/social/post-plan";
import { createClient } from "@/lib/supabase/client";
import type { SocialInstagramPublication, SocialPostDraft } from "@/lib/types/database";

type Status = { configured: boolean; account: { id: string; username: string } | null; connectionError: string | null; publication: SocialInstagramPublication | null; maxSlides: number; siteUrl?: string };
const button = "inline-flex min-h-11 items-center justify-center border border-white/20 px-4 text-sm font-semibold hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-40";

async function api(url: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente no painel.");
  return fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` } });
}

export function SocialPostInstagramPublisher({ draft, ready, needsSave, onSave, onPublicationChange, disabled, renderImages, onBusy }: {
  draft: SocialPostDraft;
  ready: boolean;
  needsSave: boolean;
  onSave: () => Promise<SocialPostDraft>;
  onPublicationChange: (postId: string, format: SocialPostDraft["format"], publication: SocialInstagramPublication | null) => void;
  disabled: boolean;
  renderImages: (snapshot?: SocialPostDraft) => Promise<Blob[]>;
  onBusy: (message: string) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [republishOf, setRepublishOf] = useState<number | null>(null);
  const inFlight = useRef(false);
  const endpoint = `/api/admin/social-posts/instagram?postId=${encodeURIComponent(draft.postId)}&format=${draft.format}`;
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api(endpoint);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível consultar a conexão do Instagram.");
      setStatus(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível consultar o Instagram."); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  useEffect(() => { const timer = setTimeout(() => setConfirmed(false), 0); return () => clearTimeout(timer); }, [draft, status?.account?.id]);

  useEffect(() => {
    onPublicationChange(draft.postId, draft.format, status?.publication || null);
  }, [draft.postId, draft.format, status?.publication, onPublicationChange]);

  async function check() {
    if (inFlight.current) return;
    inFlight.current = true; setError(""); onBusy("Conferindo o resultado no Instagram…");
    try {
      const response = await api(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível conferir o resultado.");
      setStatus(current => current ? { ...current, publication: result.publication } : current);
      setMessage(result.publication?.status === "published" ? "Publicação confirmada no Instagram." : result.publication?.status === "failed" ? "Falha confirmada. Você pode revisar e tentar novamente." : "O resultado ainda não foi confirmado. Confira a conta no Instagram antes de repetir o envio.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível conferir o resultado."); }
    finally { inFlight.current = false; onBusy(""); }
  }

  async function publish() {
    if (inFlight.current || !confirmed || !status?.account || !ready) return;
    inFlight.current = true; setError(""); setMessage("");
    const accountId = status.account.id;
    const requestJson = async (body: Record<string, unknown>) => {
      const response = await api(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (result.publication) setStatus(current => current ? { ...current, publication: result.publication } : current);
      if (!response.ok) throw new Error(result.error || "Não foi possível concluir a publicação.");
      return result;
    };
    try {
      onBusy(needsSave ? "Salvando o rascunho revisado…" : "Preparando as imagens revisadas para o Instagram…");
      const publishingDraft = needsSave ? await onSave() : draft;
      onBusy("Preparando as imagens revisadas para o Instagram…");
      const images = await renderImages(publishingDraft);
      const prepared = await requestJson({ action: "prepare", draft: publishingDraft, confirmed: true, withoutMusic: Boolean(publishingDraft.music), ...(status.publication?.status === "published" && republishOf === status.publication.attempt ? { republishOf } : {}) });
      for (const [index, image] of images.entries()) {
        onBusy(`Enviando imagem ${index + 1} de ${images.length}…`);
        const body = new FormData(); body.set("batchId", prepared.batchId); body.set("index", String(index)); body.set("image", image, `${String(index + 1).padStart(2, "0")}.jpg`);
        const response = await api(endpoint, { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível enviar uma imagem.");
      }
      onBusy("O Instagram está processando e publicando o post. Aguarde nesta tela…");
      await requestJson({ action: "publish", batchId: prepared.batchId, accountId, confirmed: true, withoutMusic: Boolean(publishingDraft.music) });
      setMessage("Publicado no Instagram."); setConfirmed(false); setRepublishOf(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O resultado não foi confirmado. Atualize o histórico antes de repetir.");
      try {
        const response = await api(endpoint);
        if (response.ok) setStatus(await response.json());
      } catch {}
    } finally { inFlight.current = false; onBusy(""); }
  }

  let captionPreview = "";
  let captionError = "";
  try { captionPreview = instagramPostCaption(draft, status?.siteUrl || ""); }
  catch (cause) { captionError = cause instanceof Error ? cause.message : "Revise a legenda e os créditos."; }
  const publication = status?.publication;
  const republishing = publication?.status === "published" && republishOf === publication.attempt;
  const blocked = publication && publication.status !== "failed" && !republishing;
  const tooMany = draft.slides.length > (status?.maxSlides || 10);
  return <section aria-labelledby="instagram-feed-title" className="mb-6 border-y border-white/10 py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="instagram-feed-title" className="font-heading text-lg font-bold">Publicar no Instagram</h3><button type="button" className={button} disabled={disabled || loading} onClick={() => void refresh()}>{loading ? "Consultando…" : "Atualizar conexão e histórico"}</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-gray-200">{message}</p>}
    {status && <>
      <p className="mt-3 text-sm text-gray-300">{status.account ? `Conta de destino: @${status.account.username}` : status.configured ? "Conexão encontrada; confirme a conta antes de publicar." : "Configure a conexão do Instagram em Reels & Vídeos para habilitar o envio direto."}</p>
      {status.connectionError && <p role="alert" className="mt-2 text-sm text-amber-200">{status.connectionError}</p>}
      {publication && <div className="mt-4 text-sm leading-6"><p className={publication.status === 'published' ? 'text-emerald-300' : 'text-amber-200'}>{publication.status === 'published' ? `Publicado em @${publication.username}` : publication.status === 'failed' ? 'O envio anterior falhou antes da confirmação de publicação.' : 'Existe um envio em andamento ou com resultado pendente.'}</p>{publication.error && <p className="mt-1 text-gray-300">{publication.error}</p>}{publication.permalink && <a href={publication.permalink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-orange underline underline-offset-4">Abrir post no Instagram</a>}{['unknown','processing'].includes(publication.status) && <button type="button" className={`${button} mt-3`} disabled={disabled} onClick={() => void check()}>Conferir resultado no Instagram</button>}</div>}
      {publication?.status === "published" && !republishing && <button type="button" className={`${button} mt-3`} disabled={disabled || loading} onClick={() => { setRepublishOf(publication.attempt); setConfirmed(false); setMessage(""); }}>Preparar nova publicação</button>}
      {republishing && <div className="mt-4 text-sm leading-6 text-amber-200"><p>Você está preparando outra publicação com este carrossel. O post anterior será mantido; curtidas e comentários não serão transferidos.</p><button type="button" className={`${button} mt-2`} disabled={disabled} onClick={() => { setRepublishOf(null); setConfirmed(false); }}>Cancelar republicação</button></div>}
      {!blocked && <>
        {captionError ? <p className="mt-3 text-sm text-amber-200">{captionError}</p> : <details className="mt-3 text-sm text-gray-300"><summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-brand-orange">Legenda que será publicada</summary><p className="whitespace-pre-wrap break-words leading-6">{captionPreview}</p></details>}
        {tooMany && <p className="mt-3 text-sm text-amber-200">O envio direto desta integração aceita até 10 imagens, incluindo o CTA. Reduza os slides ou baixe o pacote para postar pelo aplicativo.</p>}
        {!ready && <p className="mt-3 text-sm text-amber-200">A matéria mudou. Gere uma versão atualizada antes de publicar.</p>}
        {needsSave && ready && <p className="mt-3 text-sm text-gray-400">O rascunho será salvo automaticamente ao publicar.</p>}
        {draft.music && <p className="mt-3 text-sm text-amber-200">A música sugerida não será adicionada no envio direto. Para postar com música, use o pacote no aplicativo do Instagram.</p>}
        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-brand-orange" checked={confirmed} disabled={disabled} onChange={event => setConfirmed(event.target.checked)} /><span>Revisei os textos, as imagens e a ordem dos slides. Confirmo {republishing ? "criar uma nova publicação agora" : "publicar agora"}{status.account ? ` em @${status.account.username}` : ''}{draft.music ? ', sem a música sugerida' : ''}.</span></label>
        <button type="button" className={`${button} mt-3 border-brand-orange bg-brand-orange text-black hover:bg-brand-orange/90`} disabled={disabled || !ready || !confirmed || tooMany || !status.account || loading || Boolean(captionError)} onClick={() => void publish()}>{republishing ? 'Publicar novamente no Instagram' : publication?.status === 'failed' ? 'Tentar publicar novamente' : needsSave ? 'Salvar e publicar no Instagram' : 'Publicar agora no Instagram'}</button>
      </>}
    </>}
  </section>;
}
