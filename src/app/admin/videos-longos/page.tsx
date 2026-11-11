"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Check, Copy, Film, LoaderCircle, Plus, RefreshCw, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import { videoArchiveSlugs, videoDate, videoDelivery, videoVersions, type LibraryVideo, type VideoVariant } from "@/lib/video/long-video-library";

const button = "inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-3 text-sm font-semibold text-gray-200 transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} border-brand-orange bg-brand-orange text-black hover:bg-orange-400`;
const field = "min-h-11 w-full border border-white/20 bg-[#0D0E12] px-3 py-2 text-base text-white placeholder:text-gray-400 focus:border-brand-orange focus:outline-2 focus:outline-offset-2 focus:outline-brand-orange";
const labels: Record<string, string> = { scheduled: "Agendado no YouTube", uploaded: "Enviado ao YouTube", planned: "Planejamento local", pending_review: "Para revisar", approved: "Aprovado", rejected: "Ajustes solicitados", generating: "Em produção", failed: "Falha na produção" };
const variantLabels: Record<VideoVariant, string> = { full: "Vídeo completo", no_narration: "Sem narração", clean: "Sem narração e legendas", srt: "Legendas (.srt)" };

function thumbnail(video: LibraryVideo) {
  return video.thumbnails?.find(thumb => thumb.id === video.selected_thumbnail_id)?.url || video.thumbnails?.[0]?.url;
}

function VideoThumbnail({ video }: { video: LibraryVideo }) {
  const [failed, setFailed] = useState(false);
  return <span className="relative mt-1 block aspect-video w-24 shrink-0 self-start bg-white/5">{thumbnail(video) && !failed ? <img src={thumbnail(video)} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : <Film aria-hidden="true" className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-gray-500" />}</span>;
}

function Status({ video }: { video: LibraryVideo }) {
  const state = videoDelivery(video);
  return <span className={`text-xs font-semibold ${state === "scheduled" || state === "approved" ? "text-emerald-300" : state === "failed" || state === "rejected" ? "text-red-300" : "text-gray-300"}`}>{video.approved_at && state !== "approved" ? "Aprovado · " : ""}{labels[state] || "Para revisar"}</span>;
}

async function api(path: string, init: RequestInit = {}) {
  const { data: { session } } = await createDataClient().auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  const response = await fetch(path, { ...init, headers: { Authorization: `Bearer ${session.access_token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Não foi possível concluir. Tente novamente.");
  }
  return response;
}

function VideoDetails({ video, versions, openVersion, onSaved, refresh, onDirtyChange }: { video: LibraryVideo; versions: LibraryVideo[]; openVersion: (slug: string) => void; onSaved: (item: LibraryVideo) => void; refresh: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [tab, setTab] = useState("watch");
  const [title, setTitle] = useState(video.youtube.title);
  const [description, setDescription] = useState(video.youtube.description);
  const [tags, setTags] = useState(video.youtube.tags.join(", "));
  const [thumbId, setThumbId] = useState(video.selected_thumbnail_id || video.thumbnails?.[0]?.id);
  const [notes, setNotes] = useState(video.review_notes || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [playerError, setPlayerError] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const uploaded = Boolean(video.youtube.video_id);
  const canPlay = video.available_variants?.includes("full");
  const dirtyMetadata = title !== video.youtube.title || description !== video.youtube.description || tags !== video.youtube.tags.join(", ") || thumbId !== (video.selected_thumbnail_id || video.thumbnails?.[0]?.id);
  const dirty = !uploaded && dirtyMetadata || notes !== (video.review_notes || "");

  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label} copiado.`); } catch { setError("Não foi possível copiar. Selecione o texto e copie manualmente."); }
  }

  async function save(action: "metadata" | "review", decision?: "approved" | "rejected") {
    setBusy(action); setError(""); setMessage("");
    try {
      const response = await api("/api/admin/long-videos", { method: "PATCH", body: JSON.stringify({ action, slug: video.slug, updated_at: video.updated_at, title, description, tags: tags.split(",").map(tag => tag.trim()).filter(Boolean), selected_thumbnail_id: thumbId, notes, decision }) });
      const { item } = await response.json();
      onSaved({ ...video, ...item, available_variants: video.available_variants, video_url: video.video_url, video_no_narration_url: video.video_no_narration_url, video_no_narration_clean_url: video.video_no_narration_clean_url });
      setMessage(decision === "approved" ? "Vídeo aprovado. Nenhuma publicação foi realizada." : decision === "rejected" ? "Pedido de ajustes salvo." : "Alterações salvas.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); } finally { setBusy(null); }
  }

  async function download(variant: VideoVariant) {
    setBusy(variant); setError("");
    try {
      const response = await api(`/api/admin/reels/download?slug=${encodeURIComponent(video.slug)}&variant=${variant}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("O arquivo está vazio. Atualize a biblioteca e tente novamente.");
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = `${video.slug}${variant === "srt" ? ".srt" : variant === "no_narration" ? "-sem-narracao.mp4" : variant === "clean" ? "-sem-narracao-sem-legenda.mp4" : ".mp4"}`;
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60000); setMessage("Download iniciado.");
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível baixar o arquivo."); } finally { setBusy(null); }
  }

  const studioUrl = video.youtube.video_id ? `https://studio.youtube.com/video/${video.youtube.video_id}/edit` : "https://studio.youtube.com";
  return <section aria-label="Vídeo selecionado" className="min-w-0 border border-white/15 bg-[#0D0E12]">
    <header className="space-y-2 p-4 sm:p-5">
      <Status video={video} />
      <h2 className="text-xl font-bold leading-snug text-white">{video.youtube.title || video.title}</h2>
      <p className="text-sm text-gray-400">{video.duration_formatted || "Duração pendente"} <span aria-hidden="true">·</span> {video.resolution || "Resolução pendente"}{video.file_size ? ` · ${(video.file_size / 1048576).toFixed(1)} MB` : ""}</p>
      {video.youtube.scheduled_at && <p className="text-sm text-gray-200">{videoDelivery(video) === "scheduled" ? "Agendado" : "Planejado"} para <strong>{videoDate(video.youtube.scheduled_at)}</strong> · Brasília</p>}
    </header>
    <nav aria-label="Detalhes do vídeo" className="flex overflow-x-auto border-y border-white/15 px-2">
      {[["watch", "Assistir"], ["publication", "Publicação"], ["review", "Revisão"], ["files", "Arquivos"]].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => { setTab(key); setMessage(""); setError(""); }} className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-orange ${tab === key ? "border-brand-orange text-white" : "border-transparent text-gray-400 hover:text-white"}`}>{label}</button>)}
    </nav>
    <div className="space-y-5 p-4 sm:p-5">
      {error && <div role="alert" className="border border-red-400/40 p-3 text-sm text-red-200">{error}</div>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {tab === "watch" && <>
        {canPlay && !playerError ? <video key={video.video_url} ref={player} controls preload="metadata" playsInline poster={thumbnail(video)} src={video.video_url} onError={() => setPlayerError(true)} className="aspect-video w-full bg-black" aria-label={`Assistir ${video.title}`} /> : <div className="flex min-h-48 flex-col items-center justify-center gap-3 bg-white/[0.03] p-5 text-center">
          <Film aria-hidden="true" className="h-7 w-7 text-gray-400" /><p className="max-w-md text-sm text-gray-300">{video.status === "generating" ? video.pipeline_stage_label || "O vídeo está sendo produzido." : "O arquivo de vídeo não está disponível para reprodução. Atualize os links ou abra a publicação no YouTube."}</p><button type="button" onClick={() => { setPlayerError(false); refresh(); }} className={button}>Atualizar arquivos</button>
        </div>}
        {video.error && <p role="alert" className="text-sm text-red-200">{video.error}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!canPlay || Boolean(busy)} onClick={() => void download("full")}>{busy === "full" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowDownToLine aria-hidden="true" className="h-4 w-4" />}Baixar vídeo</button>{uploaded && <a href={video.youtube.video_url || `https://www.youtube.com/watch?v=${video.youtube.video_id}`} target="_blank" rel="noreferrer" className={button}>Abrir no YouTube<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>}</div>
        {video.chapters?.length > 0 && <details><summary className="cursor-pointer py-2 text-sm font-semibold text-gray-200">Capítulos ({video.chapters.length})</summary><ol className="mt-2 divide-y divide-white/10">{video.chapters.map(chapter => <li key={chapter.number}><button type="button" disabled={!canPlay || playerError} onClick={() => { if (player.current) { player.current.currentTime = chapter.start_seconds; void player.current.play().catch(() => setError("Use o botão de reprodução para iniciar o vídeo.")); } }} className="flex min-h-11 w-full gap-3 py-2 text-left text-sm text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-50"><span className="tabular-nums text-brand-orange">{chapter.timestamp}</span><span>{chapter.title}</span></button></li>)}</ol></details>}
      </>}
      {tab === "publication" && <>
        {uploaded && <div className="space-y-3 text-sm"><p className="text-gray-300">Este vídeo já foi enviado. Altere título, miniatura e agendamento no YouTube Studio.</p><a href={studioUrl} target="_blank" rel="noreferrer" className={button}>Editar no YouTube Studio<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a></div>}
        {!uploaded && <p className="text-sm text-gray-400">Prepare os dados aqui. Salvar não envia nem agenda o vídeo no YouTube.</p>}
        <form className="space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void save("metadata"); }}>
          <label className="block space-y-2 text-sm text-gray-200"><span className="flex justify-between">Título <span className="text-gray-400">{title.length}/100</span></span><input value={title} readOnly={uploaded} onChange={event => setTitle(event.target.value)} maxLength={100} required className={field} /></label>
          <label className="block space-y-2 text-sm text-gray-200"><span>Descrição e hashtags</span><textarea value={description} readOnly={uploaded} onChange={event => setDescription(event.target.value)} maxLength={5000} rows={9} className={field} /></label>
          <label className="block space-y-2 text-sm text-gray-200"><span>Tags separadas por vírgula</span><input value={tags} readOnly={uploaded} onChange={event => setTags(event.target.value)} className={field} /></label>
          <div className="flex flex-wrap gap-2">{!uploaded && <button type="submit" disabled={Boolean(busy) || !dirtyMetadata} className={primary}>{busy === "metadata" ? "Salvando…" : "Salvar dados"}</button>}<button type="button" className={button} onClick={() => void copy(`${title}\n\n${description}`, "Título e descrição")}><Copy aria-hidden="true" className="h-4 w-4" />Copiar para o YouTube</button></div>
          {video.thumbnails?.length > 0 && <fieldset><legend className="mb-3 text-sm font-semibold text-gray-200">Miniatura{uploaded ? " registrada no painel" : " do vídeo"}</legend><div className="grid gap-3 sm:grid-cols-3">{video.thumbnails.map(thumb => <label key={thumb.id} className={`block cursor-pointer border p-2 ${thumbId === thumb.id ? "border-brand-orange" : "border-white/15"}`}><img src={thumb.url} alt={thumb.headline || thumb.label} className="aspect-video w-full object-cover" loading="lazy" /><span className="mt-2 flex items-center gap-2 text-xs text-gray-200"><input type="radio" name="thumbnail" value={thumb.id} checked={thumbId === thumb.id} disabled={uploaded} onChange={() => setThumbId(thumb.id)} className="h-4 w-4 accent-orange-500" />{thumb.label}</span></label>)}</div></fieldset>}
        </form>
      </>}
      {tab === "review" && <>
        <div className="space-y-2 text-sm text-gray-300"><p>{video.approved_at ? `Aprovação registrada em ${videoDate(video.approved_at)} · Brasília.` : "Esta versão não tem aprovação registrada."}</p>{video.replaced_by_slug && <p>Versão anterior preservada. A aprovação da reedição pertence ao novo arquivo.</p>}</div>
        <details><summary className="cursor-pointer py-2 text-sm font-semibold text-gray-200">Histórico e versões ({versions.length})</summary><ul className="mt-2 divide-y divide-white/10">{versions.map(version => <li key={version.slug} className="space-y-2 py-3"><button type="button" disabled={version.slug === video.slug} onClick={() => openVersion(version.slug)} className="min-h-11 text-left text-sm font-semibold text-gray-200 underline decoration-white/30 underline-offset-4 hover:text-white disabled:no-underline">{version.title}{version.slug === video.slug ? " · versão aberta" : ""}</button><p className="text-xs text-gray-400">{version.approved_at ? `Aprovado · ${videoDate(version.approved_at)}` : "Sem aprovação registrada"}{version.replaced_by_slug ? " · substituído por reedição" : ""}</p></li>)}</ul><ol className="mt-4 space-y-3">{(video.review_history || []).map(event => <li key={event.id} className="text-sm"><p className="text-gray-200">{event.detail}</p><time dateTime={event.at} className="text-xs text-gray-400">Registro: {videoDate(event.at)} · Brasília</time></li>)}</ol>{!video.review_history?.length && <p className="py-3 text-sm text-gray-400">Nenhum evento anterior foi registrado para esta versão.</p>}</details>
        <label className="block space-y-2 text-sm text-gray-200"><span>Notas de revisão</span><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={5} maxLength={10000} placeholder="O que precisa ser ajustado ou conferido?" className={field} /></label>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={Boolean(busy) || notes === (video.review_notes || "")} onClick={() => void save("review")}>Salvar notas</button>{!uploaded && video.status !== "generating" && <><button type="button" disabled={Boolean(busy) || !canPlay || video.status === "approved"} className={primary} onClick={() => void save("review", "approved")}><Check aria-hidden="true" className="h-4 w-4" />Aprovar vídeo</button><button type="button" disabled={Boolean(busy) || !notes.trim()} className={button} onClick={() => void save("review", "rejected")}>Solicitar ajustes</button></>}</div>
        {video.qa_checks?.length > 0 && <details><summary className="cursor-pointer py-2 text-sm text-gray-200">Conferências de produção ({video.qa_checks.filter(check => check.passed).length}/{video.qa_checks.length})</summary><ul className="mt-2 space-y-3">{video.qa_checks.map(check => <li key={check.id} className="text-sm"><p className="font-semibold text-gray-200">{check.passed ? "Conferido" : "Pendente"} · {check.label}</p><p className="mt-1 text-gray-400">{check.detail}</p></li>)}</ul></details>}
      </>}
      {tab === "files" && <><p className="text-sm text-gray-400">Somente arquivos encontrados na biblioteca ficam disponíveis para baixar.</p><ul className="divide-y divide-white/10">{(Object.entries(variantLabels) as [VideoVariant, string][]).map(([variant, label]) => <li key={variant} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm text-gray-200">{label}</span>{video.available_variants?.includes(variant) ? <button type="button" disabled={Boolean(busy)} className={button} onClick={() => void download(variant)}><ArrowDownToLine aria-hidden="true" className="h-4 w-4" />{busy === variant ? "Preparando…" : "Baixar"}</button> : <span className="text-xs text-gray-400">Indisponível</span>}</li>)}</ul></>}
    </div>
  </section>;
}

export default function AdminVideosLongosPage() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [archive, setArchive] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const canLeave = () => !dirtyRef.current || window.confirm("Há alterações não salvas. Descartar e continuar?");
  const archiveSlugs = useMemo(() => videoArchiveSlugs(videos), [videos]);
  const load = useCallback(async () => {
    setRefreshing(true); setError("");
    try { const response = await api("/api/admin/long-videos"); const result = await response.json(); setVideos(result.videos || []); } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível carregar os vídeos."); } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  const visible = useMemo(() => videos.filter(video => {
    const state = videoDelivery(video);
    return archive === archiveSlugs.has(video.slug) && (!search.trim() || `${video.title} ${video.youtube.title}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))) && (filter === "all" || filter === "review" && ["pending_review", "rejected", "failed"].includes(state) || filter === "scheduled" && state === "scheduled" || filter === "production" && state === "generating");
  }), [videos, archiveSlugs, archive, search, filter]);
  const selected = visible.find(video => video.slug === selectedSlug) || visible[0];
  return <AdminShell active="long-videos" title="Vídeos longos" description="Encontre uma produção, revise o vídeo e acompanhe a publicação." wide actions={<div className="flex gap-2"><Link href="/admin/reels" onClick={event => { if (!canLeave()) event.preventDefault(); }} className={button}><Film aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Reels</span><span className="sr-only sm:hidden">Reels</span></Link><button type="button" onClick={() => void load()} disabled={refreshing} aria-label="Atualizar biblioteca" className={button}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Atualizar</span></button><Link href="/admin/reels?mode=long&create=1" aria-label="Nova produção" onClick={event => { if (!canLeave()) event.preventDefault(); }} className={primary}><Plus aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Nova produção</span></Link></div>}>
    <div className="space-y-5 font-sans">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-h-11 items-center gap-2 border border-white/20 bg-[#0D0E12] px-3 sm:max-w-md sm:flex-1"><Search aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400" /><input aria-label="Buscar vídeos" placeholder="Buscar pelo título…" value={search} onChange={event => { if (canLeave()) setSearch(event.target.value); }} className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-gray-400 focus:outline-none" /></div>
        <select aria-label="Filtrar por situação" value={filter} onChange={event => { if (canLeave()) setFilter(event.target.value); }} className={`${field} sm:w-auto`}><option value="all">Todas as situações</option><option value="review">Para revisar e ajustar</option><option value="scheduled">Agendados no YouTube</option><option value="production">Em produção</option></select>
        <button type="button" aria-pressed={archive} onClick={() => { if (!canLeave()) return; setArchive(!archive); setSelectedSlug(""); }} className={`${button} sm:ml-auto`}>{archive ? "Voltar às versões atuais" : `Arquivo e prévias (${archiveSlugs.size})`}</button>
      </div>
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-red-400/40 p-4 text-sm text-red-200"><span>{error}</span><button type="button" disabled={refreshing} onClick={() => void load()} className={button}>Tentar novamente</button></div>}
      {loading ? <div role="status" aria-label="Carregando vídeos" className="space-y-3">{[0, 1, 2].map(index => <div key={index} className="h-24 animate-pulse bg-white/5 motion-reduce:animate-none" />)}</div> : visible.length === 0 ? <div className="border border-white/15 px-5 py-14 text-center"><Film aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-gray-400" /><h2 className="text-lg font-semibold text-white">{videos.length ? "Nenhum vídeo nesta busca" : "Sua biblioteca começa aqui"}</h2><p className="mt-2 text-sm text-gray-400">{videos.length ? "Mude o título, a situação ou consulte o arquivo." : "Crie uma produção para revisar e organizar seus vídeos neste espaço."}</p>{videos.length > 0 && <button type="button" onClick={() => { setSearch(""); setFilter("all"); setArchive(false); }} className={`${button} mt-5`}>Limpar filtros</button>}</div> : <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section aria-label="Biblioteca de vídeos" className="hidden min-w-0 xl:block"><div className="mb-3 flex justify-between text-sm text-gray-400"><span>{archive ? "Arquivo e prévias" : "Versões atuais"}</span><span>{visible.length} {visible.length === 1 ? "vídeo" : "vídeos"}</span></div><div className="divide-y divide-white/10 border-y border-white/15 xl:max-h-[760px] xl:overflow-y-auto">{visible.map(video => <button key={video.slug} type="button" aria-pressed={selected?.slug === video.slug} onClick={() => { if (selected?.slug === video.slug || canLeave()) setSelectedSlug(video.slug); }} className={`flex min-h-28 w-full gap-3 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-orange ${selected?.slug === video.slug ? "bg-white/[0.08]" : "hover:bg-white/[0.03]"}`}>
          <VideoThumbnail video={video} /><span className="min-w-0 space-y-1"><span className="block text-sm font-semibold leading-snug text-white">{video.youtube.title || video.title}</span><span className="block"><Status video={video} /></span><span className="block text-xs text-gray-400">{video.duration_formatted}{video.youtube.scheduled_at ? ` · ${videoDate(video.youtube.scheduled_at)} BRT` : ""}</span></span>
        </button>)}</div></section>
        <label className="block space-y-2 text-sm text-gray-300 xl:hidden"><span>{archive ? "Arquivo e prévias" : "Versões atuais"} · {visible.length} vídeos</span><select aria-label="Selecionar vídeo" value={selected?.slug || ""} onChange={event => { if (canLeave()) setSelectedSlug(event.target.value); }} className={field}>{visible.map(video => <option key={video.slug} value={video.slug}>{video.youtube.title || video.title}</option>)}</select></label>
        {selected && <VideoDetails key={selected.slug} video={selected} versions={videoVersions(selected, videos)} openVersion={slug => { if (!canLeave()) return; setArchive(archiveSlugs.has(slug)); setSearch(""); setFilter("all"); setSelectedSlug(slug); }} onSaved={item => setVideos(current => current.map(video => video.slug === item.slug ? item : video))} refresh={() => void load()} onDirtyChange={onDirtyChange} />}
      </div>}
    </div>
  </AdminShell>;
}
