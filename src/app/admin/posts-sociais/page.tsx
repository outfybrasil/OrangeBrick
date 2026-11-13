"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialPostInstagramPublisher } from "@/components/admin/SocialPostInstagramPublisher";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { Post, SocialInstagramPublication, SocialPostListStatus, SocialPostAsset, SocialPostDraft, SocialPostSlide } from "@/lib/types/database";
import { assertSocialDraftQuality, instagramPostCaption, generateSocialCaption, generateSocialDraft, socialDraftQualityIssues, validateSocialDraft, type SocialSourcePost } from "@/lib/social/post-plan";
import { loadSocialImage, renderSocialCoverMotion, renderSocialSlide, renderSocialStory, socialCanvasJpeg, socialRenderFont, SOCIAL_MOTION_SECONDS, SOCIAL_SLIDE_HEIGHT, SOCIAL_SLIDE_WIDTH } from "@/lib/social/render-post";
import { encodeSocialVideo, socialVideoSupported } from "@/lib/social/cover-video";
import { createSocialZip } from "@/lib/social/zip";

const control = "min-h-11 w-full border border-white/20 bg-[#15171d] px-3 py-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-50";
const button = "inline-flex min-h-11 items-center justify-center border border-white/20 px-4 text-sm font-semibold hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand-orange disabled:opacity-40";
type Source = { post: SocialSourcePost; assets: SocialPostAsset[]; drafts: Partial<Record<SocialPostDraft["format"], SocialPostDraft>>; defaultsApplied?: string[] };
type ListItem = Pick<Post, "id" | "title">;

async function adminFetch(url: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente no painel.");
  const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "Não foi possível concluir a operação. Tente novamente.");
  }
  return response;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function SocialPostEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const postId = params.get("postId") || "";
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListItem[]>([]);
  const [listStatuses, setListStatuses] = useState<Record<string, SocialPostListStatus>>({});
  const [pages, setPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [format, setFormat] = useState<SocialPostDraft["format"]>("carousel");
  const [draft, setDraft] = useState<SocialPostDraft | null>(null);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [videoSupported, setVideoSupported] = useState(false);
  const [message, setMessage] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [reload, setReload] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef(new Map<string, Promise<HTMLImageElement>>());
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setListLoading(true);
      try {
        const response = await adminFetch(`/api/admin/posts?page=${page}&pageSize=20&search=${encodeURIComponent(query)}`, { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        setList(result.posts); setPages(Math.max(1, result.totalPages)); setListLoading(false);
        const ids = (result.posts as ListItem[]).map(post => post.id);
        if (ids.length) {
          try {
            const response = await adminFetch(`/api/admin/social-posts/status?ids=${ids.join(",")}`, { signal: controller.signal });
            const data = await response.json();
            if (!controller.signal.aborted) setListStatuses(current => ({ ...current, ...Object.fromEntries(Object.entries(data.statuses as Record<string, SocialPostListStatus>).map(([id, value]) => [id, current[id]?.status === "published" ? current[id] : value])) }));
          } catch {
            if (!controller.signal.aborted) setListStatuses(current => ({ ...current, ...Object.fromEntries(ids.map(id => [id, { status: "unavailable", publishedFormats: [] }])) }));
          }
        }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao buscar matérias."); }
      finally { if (!controller.signal.aborted) setListLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, reload]);

  useEffect(() => {
    if (!postId) return;
    const controller = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      setLoading(true); setSource(null); setDraft(null); setError(""); setMessage(""); setDirty(false); setSelected(0);
      try {
        const response = await adminFetch(`/api/admin/social-posts?postId=${encodeURIComponent(postId)}`, { signal: controller.signal });
        const result: Source = await response.json();
        if (controller.signal.aborted) return;
        setSource(result); setFormat("carousel"); setDraft(result.drafts.carousel || null);
        if (result.defaultsApplied?.includes("carousel")) { setDirty(true); setMessage("Descrições, origens e padrões antigos foram preenchidos com os dados da matéria. Revise antes de publicar; o rascunho será salvo no envio."); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao abrir matéria."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [postId, reload]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    let active = true;
    void socialVideoSupported(SOCIAL_SLIDE_WIDTH, SOCIAL_SLIDE_HEIGHT).then(value => { if (active) setVideoSupported(value); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  const resources = useCallback(async (slide: SocialPostSlide) => {
    const logoKey = "logo";
    if (!imageCache.current.has(logoKey)) imageCache.current.set(logoKey, loadSocialImage("/logos/orange-brick-horizontal-dark.png").catch(cause => { imageCache.current.delete(logoKey); throw cause; }));
    const logo = await imageCache.current.get(logoKey)!;
    const assetImage = (asset: number, imageUrl: string) => {
      const key = `${postId}:${source?.post.updated_at}:${imageUrl}`;
      if (!imageCache.current.has(key)) imageCache.current.set(key, (async () => {
        const response = await adminFetch(`/api/admin/social-posts?postId=${encodeURIComponent(postId)}&asset=${asset}`);
        const url = URL.createObjectURL(await response.blob()); objectUrls.current.push(url);
        return loadSocialImage(url);
      })().catch(cause => { imageCache.current.delete(key); throw cause; }));
      return imageCache.current.get(key)!;
    };
    let image: HTMLImageElement | undefined;
    let backdrop: HTMLImageElement | undefined;
    if (slide.imageUrl) {
      const asset = source?.assets.findIndex(asset => asset.url === slide.imageUrl) ?? -1;
      if (asset < 0) throw new Error("A imagem não está mais vinculada à matéria. Selecione outra imagem.");
      image = await assetImage(asset, slide.imageUrl);
    } else if (source?.assets[0]) {
      backdrop = await assetImage(0, source.assets[0].url);
    }
    return { logo, image, backdrop, font: await socialRenderFont() };
  }, [postId, source]);

  const slide = draft?.slides[selected];
  useEffect(() => {
    if (!slide || !canvas.current) return;
    let cancelled = false;
    const timer = setTimeout(() => { setPreviewLoading(true); setPreviewError(""); void resources(slide).then(value => {
      if (!cancelled && canvas.current) renderSocialSlide(canvas.current, slide, selected, draft?.slides.length || 1, value);
    }).catch(cause => { if (!cancelled) setPreviewError(cause instanceof Error ? cause.message : "Não foi possível preparar a prévia."); }).finally(() => { if (!cancelled) setPreviewLoading(false); }); }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slide, selected, draft?.slides.length, resources, previewVersion]);

  function updateDraft(patch: Partial<SocialPostDraft>) {
    setDraft(current => current ? { ...current, ...patch } : current); setDirty(true); setMessage(""); setError("");
  }
  function updateSlide(patch: Partial<SocialPostSlide>) {
    if (!draft) return;
    updateDraft({ slides: draft.slides.map((item, index) => index === selected ? { ...item, ...patch } : item) });
  }
  function generate() {
    if (!source || (draft && !window.confirm("Gerar uma nova versão substituirá o conteúdo aberto neste formato. Continuar?"))) return;
    setDraft(generateSocialDraft(source.post, format)); setSelected(0); setDirty(true); setError(""); setMessage("Rascunho gerado a partir da matéria. Revise os textos e os créditos antes de baixar.");
  }
  function chooseFormat(next: SocialPostDraft["format"]) {
    if (next === format || (dirty && !window.confirm("Há alterações não salvas. Trocar de formato e descartá-las?"))) return;
    setFormat(next); setDraft(source?.drafts[next] || null); setSelected(0); setDirty(Boolean(source?.defaultsApplied?.includes(next))); setMessage(source?.defaultsApplied?.includes(next) ? "Os campos faltantes foram preenchidos com os dados da matéria. Revise antes de publicar." : ""); setError("");
  }
  async function persistDraft(): Promise<SocialPostDraft> {
    if (!draft || !source) throw new Error("Selecione uma matéria e um rascunho.");
    const validated = validateSocialDraft(draft, source.post);
    const response = await adminFetch(`/api/admin/social-posts?postId=${postId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validated) });
    const result = await response.json();
    setDraft(result.draft); setSource({ ...source, drafts: { ...source.drafts, [format]: result.draft }, defaultsApplied: source.defaultsApplied?.filter(item => item !== format) }); setDirty(false);
    return result.draft;
  }
  async function save() {
    setBusy("Salvando rascunho…"); setError(""); setMessage("");
    try { await persistDraft(); setMessage("Rascunho salvo. Você pode retomar a edição nesta matéria."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Erro ao salvar."); }
    finally { setBusy(""); }
  }
  async function renderCoverVideo(snapshot: SocialPostDraft) {
    const cover = snapshot.slides[0];
    const target = document.createElement("canvas");
    const resource = await resources(cover);
    return encodeSocialVideo(target, SOCIAL_MOTION_SECONDS, time => renderSocialCoverMotion(target, cover, snapshot.slides.length, resource, time));
  }
  async function renderStory(snapshot: SocialPostDraft) {
    const target = document.createElement("canvas");
    renderSocialStory(target, snapshot.slides[0], await resources(snapshot.slides[0]));
    return socialCanvasJpeg(target);
  }
  async function exportStory() {
    if (!draft || !source) return;
    setError(""); setMessage(""); setBusy("Preparando o story…");
    try { download(await renderStory(draft), `${source.post.slug}-story.jpg`); setMessage("Story baixado. Adicione o adesivo de link para a matéria ao publicar."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível baixar o story."); }
    finally { setBusy(""); }
  }
  async function exportImages(onlySelected = false) {
    if (!draft || !source) return;
    setError(""); setMessage("");
    try {
      validateSocialDraft(draft, source.post);
      if (!onlySelected) assertSocialDraftQuality(draft);
      if (draft.sourceUpdatedAt !== source.post.updated_at) throw new Error("A matéria foi alterada. Gere uma nova versão antes de exportar.");
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const indices = onlySelected ? [selected] : draft.slides.map((_, index) => index);
      for (const index of indices) {
        if (index === 0 && draft.coverMotion) {
          setBusy("Gerando o vídeo da capa…");
          const video = await renderCoverVideo(draft);
          if (onlySelected) { download(video, `${source.post.slug}-01.mp4`); setMessage("Vídeo da capa baixado."); return; }
          files.push({ name: "slides/01.mp4", data: new Uint8Array(await video.arrayBuffer()) });
        }
        setBusy(`Preparando imagem ${index + 1} de ${draft.slides.length}…`);
        const target = document.createElement("canvas");
        renderSocialSlide(target, draft.slides[index], index, draft.slides.length, await resources(draft.slides[index]));
        const blob = await socialCanvasJpeg(target);
        const name = `${String(index + 1).padStart(2, "0")}.jpg`;
        if (onlySelected) { download(blob, `${source.post.slug}-${name}`); setMessage("Imagem baixada."); return; }
        files.push({ name: index === 0 && draft.coverMotion ? "alternativas/01-capa-estatica.jpg" : `slides/${name}`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      setBusy("Preparando o story…");
      files.push({ name: "story/story.jpg", data: new Uint8Array(await (await renderStory(draft)).arrayBuffer()) });
      const encoder = new TextEncoder();
      const origin = window.location.origin;
      const caption = instagramPostCaption(draft, origin);
      const credits = draft.slides.map((item, index) => ({ slide: index + 1, textoAlternativo: [item.alt, item.title, item.text].filter(Boolean).join(". "), legenda: item.caption, imagem: item.imageUrl }));
      files.push({ name: "legenda.txt", data: encoder.encode(caption) }, { name: "creditos-e-acessibilidade.json", data: encoder.encode(JSON.stringify(credits, null, 2)) }, { name: "instrucoes.txt", data: encoder.encode(`Orange Brick — ${draft.slides.length} slide(s), 1080 × 1350.\nSelecione os arquivos da pasta slides em ordem numérica, no formato retrato 4:5, sem zoom. O CTA já conta no total de slides.\n${draft.coverMotion ? "A capa é um vídeo de 5 segundos sem som. Se preferir publicar só imagens, use alternativas/01-capa-estatica.jpg no lugar.\n" : ""}O story de divulgação está em story/story.jpg (1080 × 1920). Ao publicar, adicione o adesivo de link para a matéria na área livre abaixo do texto.\nRevise os textos e os créditos antes de publicar.\n${draft.music ? `Música sugerida: ${draft.music}. Adicione pelo catálogo do Instagram, se disponível para a conta.\n` : ""}Nenhum arquivo contém áudio.\nMatéria: ${origin}/posts/${source.post.slug}\n`) });
      download(new Blob([new Uint8Array(createSocialZip(files))], { type: "application/zip" }), `${source.post.slug}-${format}.zip`);
      setMessage("Pacote baixado com imagens, legenda, créditos e textos alternativos.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível baixar. Tente novamente."); }
    finally { setBusy(""); }
  }
  async function renderInstagramImages(snapshot = draft) {
    if (!snapshot || !source) throw new Error("Selecione uma matéria e um rascunho.");
    validateSocialDraft(snapshot, source.post);
    assertSocialDraftQuality(snapshot);
    if (snapshot.sourceUpdatedAt !== source.post.updated_at) throw new Error("A matéria mudou. Gere uma nova versão.");
    const images: Blob[] = [];
    for (const [index, item] of snapshot.slides.entries()) {
      if (index === 0 && snapshot.coverMotion) { images.push(await renderCoverVideo(snapshot)); continue; }
      const target = document.createElement("canvas");
      renderSocialSlide(target, item, index, snapshot.slides.length, await resources(item));
      images.push(await socialCanvasJpeg(target));
    }
    return images;
  }
  function addSlide() {
    if (!draft || draft.slides.length >= 20) return;
    const next: SocialPostSlide = { id: crypto.randomUUID(), kind: "content", title: "", text: "", imageUrl: "", alt: "", caption: "", fit: "contain", positionX: 50, positionY: 50 };
    const items = [...draft.slides]; items.splice(items.length - 1, 0, next); updateDraft({ slides: items }); setSelected(items.length - 2);
  }
  function moveSlide(direction: number) {
    if (!draft) return;
    const next = selected + direction;
    if (next < 1 || next >= draft.slides.length - 1) return;
    const items = [...draft.slides]; [items[selected], items[next]] = [items[next], items[selected]]; updateDraft({ slides: items }); setSelected(next);
  }
  const updatePublicationStatus = useCallback((id: string, publicationFormat: SocialPostDraft["format"], publication: SocialInstagramPublication | null) => {
    if (!publication) return;
    setListStatuses(current => {
      const previous = current[id];
      const publishedFormats = [...new Set([...(previous?.publishedFormats || []), ...(publication.status === "published" ? [publicationFormat] : [])])];
      return { ...current, [id]: { status: publishedFormats.length ? "published" : publication.status, publishedFormats } };
    });
  }, []);
  const stale = draft && source && draft.sourceUpdatedAt !== source.post.updated_at;
  const qualityIssues = useMemo(() => draft ? socialDraftQualityIssues(draft) : [], [draft]);

  return <AdminShell active="social-posts" title="Posts & Carrosséis" description="Transforme uma matéria em imagens para o feed. Revise a composição e baixe para publicar." wide>
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-white/10 pb-5 lg:border-b-0 lg:pb-0">
        <label className="block text-sm font-semibold">Buscar matéria<input className={`${control} mt-2`} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Título da notícia" type="search" /></label>
        <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-white/10 lg:max-h-[65vh]" aria-label="Matérias disponíveis" aria-busy={listLoading}>
          {listLoading && <p role="status" className="py-3 text-sm text-gray-400">Buscando matérias…</p>}
          {!listLoading && list.length === 0 && <p className="py-4 text-sm text-gray-400">Nenhuma matéria encontrada. Tente outro título.</p>}
          {list.map(post => <button key={post.id} disabled={Boolean(busy)} onClick={() => { if (post.id === postId || (dirty && !window.confirm("Descartar as alterações não salvas e abrir outra matéria?"))) return; router.push(`/admin/posts-sociais?postId=${post.id}`); }} aria-current={post.id === postId ? "true" : undefined} className={`w-full px-3 py-4 text-left text-sm leading-5 focus-visible:outline-2 focus-visible:outline-brand-orange ${post.id === postId ? "bg-white/5 font-bold text-brand-orange" : "text-gray-300 hover:bg-white/5"}`}><span className="block">{post.title}</span><PublicationBadge value={listStatuses[post.id]} /></button>)}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2"><button className={button} disabled={page === 1 || listLoading} onClick={() => setPage(page - 1)} aria-label="Página anterior de matérias">Anterior</button><span className="text-xs text-gray-400">{page}/{pages}</span><button className={button} disabled={page >= pages || listLoading} onClick={() => setPage(page + 1)}>Próxima</button></div>
      </aside>
      <section className="min-w-0" aria-label="Editor do post">
        {error && <div role="alert" className="mb-4 border border-red-400/30 p-4 text-sm text-red-200">{error} <button className="ml-2 underline" onClick={() => { if (!dirty || window.confirm("Recarregar descartará as alterações não salvas. Continuar?")) setReload(value => value + 1); }}>Tentar carregar novamente</button></div>}
        {message && <p role="status" className="mb-4 border border-brand-orange/30 p-4 text-sm text-gray-200">{message}</p>}
        {loading && <p role="status" className="py-16 text-center text-gray-300">Abrindo matéria e rascunhos…</p>}
        {!postId && <div className="border-y border-white/10 py-16"><h2 className="font-heading text-2xl font-bold">Escolha uma matéria para começar</h2><p className="mt-3 max-w-prose text-sm leading-6 text-gray-400">Gere uma imagem única ou um carrossel usando o conteúdo e as imagens da notícia. Os materiais ficam salvos por matéria e formato.</p></div>}
        {source && !loading && <>
          <div className="mb-5 border-b border-white/10 pb-5"><h2 className="font-heading text-xl font-bold">{source.post.title}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><Link className="text-brand-orange underline underline-offset-4" href={`/admin/edit?id=${postId}`}>Editar matéria</Link><Link className="text-brand-orange underline underline-offset-4" href={`/admin/reels?postId=${postId}`}>Gerar ou revisar Reels</Link></div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400"><span>Post: {source.drafts.single ? "rascunho salvo" : "não gerado"}</span><span>Carrossel: {source.drafts.carousel ? "rascunho salvo" : "não gerado"}</span></div>
          </div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div role="group" aria-label="Formato do post" className="flex gap-2">{([['single', 'Imagem única'], ['carousel', 'Carrossel']] as const).map(([value, label]) => <button key={value} disabled={Boolean(busy)} aria-pressed={format === value} onClick={() => chooseFormat(value)} className={`${button} ${format === value ? 'border-brand-orange text-brand-orange' : ''}`}>{label}</button>)}</div><button className={button} disabled={Boolean(busy) || source.assets.length === 0} onClick={generate}>{draft ? "Gerar nova versão" : "Gerar rascunho"}</button></div>
          {source.assets.length === 0 && <p role="alert" className="mb-4 text-sm text-amber-200">Adicione uma capa à matéria para gerar o post.</p>}
          {stale && <p role="alert" className="mb-4 border border-amber-300/30 p-3 text-sm text-amber-200">A matéria mudou desde este rascunho. Gere uma nova versão para usar o conteúdo atualizado.</p>}
          {!draft && <p className="border-y border-white/10 py-12 text-sm text-gray-400">Este formato ainda não tem rascunho. Clique em Gerar rascunho para preparar a capa e os slides.</p>}
          {draft && slide && <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-300">{draft.slides.length} de {format === 'single' ? 1 : 20} imagens {format === 'carousel' && '(CTA incluído)'}<span className="ml-3 text-gray-400">{dirty ? "Alterações não salvas" : draft.savedAt ? `Salvo em ${new Date(draft.savedAt).toLocaleString('pt-BR')}` : "Rascunho aberto"}</span></p><div className="flex flex-wrap gap-2"><button className={button} disabled={Boolean(busy) || Boolean(stale)} onClick={() => void save()}>Salvar rascunho</button><button className={`${button} border-brand-orange bg-brand-orange text-black hover:bg-brand-orange/90`} disabled={Boolean(busy) || Boolean(stale) || previewLoading || Boolean(previewError)} onClick={() => void exportImages()}>Baixar pacote</button><button className={button} disabled={Boolean(busy) || Boolean(stale) || previewLoading || Boolean(previewError)} onClick={() => void exportStory()}>Baixar story</button></div></div>
            {busy && <p role="status" className="mb-3 text-sm text-brand-orange">{busy}</p>}
            {qualityIssues.length > 0 && <div role="alert" className="mb-4 border border-amber-300/30 p-3 text-sm text-amber-200"><p className="font-semibold">Revise antes de baixar ou publicar:</p><ul className="mt-2 list-disc space-y-1 pl-5">{qualityIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
            <SocialPostInstagramPublisher key={`${draft.postId}:${draft.format}`} draft={draft} ready={!stale} needsSave={dirty || !draft.savedAt} onSave={persistDraft} onPublicationChange={updatePublicationStatus} disabled={Boolean(busy)} renderImages={renderInstagramImages} onBusy={setBusy} />
            <fieldset disabled={Boolean(busy)} className="min-w-0">
              <legend className="sr-only">Editar slides e legenda</legend>
              <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Escolher slide">{draft.slides.map((item, index) => <button key={item.id} onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`Slide ${index + 1}: ${item.kind === 'cover' ? 'Capa' : item.kind === 'cta' ? 'CTA' : item.title || 'Conteúdo'}`} className={`${button} min-w-11 px-3 ${index === selected ? 'border-brand-orange text-brand-orange' : ''}`}>{index + 1}</button>)}{format === 'carousel' && <button className={button} disabled={draft.slides.length >= 20} onClick={addSlide}>Adicionar slide</button>}</div>
              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                <div className="min-w-0"><div className="relative aspect-[4/5] bg-[#0d0e12]" aria-busy={previewLoading}><canvas ref={canvas} role="img" aria-label={`Prévia do slide ${selected + 1}: ${slide.alt || slide.title}`} className={`h-full w-full ${previewLoading || previewError ? 'invisible' : ''}`} />{previewLoading && <p role="status" className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">Preparando prévia…</p>}{previewError && <div role="alert" className="absolute inset-0 flex flex-col justify-center gap-4 p-6 text-sm text-red-200"><p>{previewError}</p><button className={button} onClick={() => setPreviewVersion(value => value + 1)}>Tentar novamente</button></div>}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-gray-400">1080 × 1350 · Prévia igual à exportação</p><button className={button} disabled={previewLoading || Boolean(previewError) || Boolean(stale)} onClick={() => void exportImages(true)}>Baixar este slide</button></div></div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-heading text-lg font-bold">{slide.kind === 'cover' ? 'Capa' : slide.kind === 'cta' ? 'Chamada final' : `Slide ${selected + 1}`}</h3>{slide.kind === 'content' && <div className="flex flex-wrap gap-2"><button className={button} disabled={selected <= 1} onClick={() => moveSlide(-1)} aria-label="Mover slide para antes">Antes</button><button className={button} disabled={selected >= draft.slides.length - 2} onClick={() => moveSlide(1)} aria-label="Mover slide para depois">Depois</button><button className={`${button} text-red-200`} onClick={() => { updateDraft({ slides: draft.slides.filter((_, index) => index !== selected) }); setSelected(Math.max(0, selected - 1)); }}>Remover</button></div>}</div>
                  <label className="block text-sm">Manchete<textarea className={`${control} mt-2 min-h-24`} maxLength={110} value={slide.title} onChange={event => updateSlide({ title: event.target.value })} /></label>
                  <label className="block text-sm">Texto do slide<textarea className={`${control} mt-2 min-h-28`} maxLength={300} value={slide.text} onChange={event => updateSlide({ text: event.target.value })} /></label>
                  {slide.kind !== 'cta' && <><label className="block text-sm">Imagem da matéria<select className={`${control} mt-2`} value={slide.imageUrl} onChange={event => { const asset = source.assets.find(asset => asset.url === event.target.value); updateSlide({ imageUrl: asset?.url || '', alt: asset?.alt || '', caption: asset?.caption || '', positionX: 50, positionY: 50 }); }}><option value="">{slide.kind === 'cover' ? 'Selecione a capa' : 'Somente texto'}</option>{source.assets.map((asset, index) => <option key={asset.url} value={asset.url} disabled={draft.slides.some((item, i) => i !== selected && item.imageUrl === asset.url)}>{index === 0 ? 'Capa da matéria' : `Imagem ${index}`} — {asset.alt || 'Sem texto alternativo'}</option>)}</select></label>{slide.imageUrl && <><label className="block text-sm">Enquadramento<select className={`${control} mt-2`} value={slide.fit} onChange={event => updateSlide({ fit: event.target.value as SocialPostSlide['fit'] })}><option value="contain">Mostrar imagem completa</option><option value="cover">Preencher área da imagem</option></select></label>{slide.fit === 'cover' && <div className="grid grid-cols-2 gap-4">{(['positionX', 'positionY'] as const).map((axis, index) => <label key={axis} className="block text-sm">{index === 0 ? 'Posição horizontal' : 'Posição vertical'}<input type="range" min="0" max="100" value={slide[axis]} onChange={event => updateSlide({ [axis]: Number(event.target.value) })} className="mt-3 min-h-11 w-full accent-brand-orange" /></label>)}</div>}<label className="block text-sm">Texto alternativo<textarea className={`${control} mt-2`} maxLength={500} value={slide.alt} onChange={event => updateSlide({ alt: event.target.value })} /></label><label className="block text-sm">Legenda e crédito da imagem<textarea className={`${control} mt-2`} maxLength={500} value={slide.caption} onChange={event => updateSlide({ caption: event.target.value })} placeholder="Quem ou o que aparece; crédito da imagem" /></label></>}</>}
                </div>
              </div>
              <div className="mt-8 grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.6fr)]"><div><label className="block text-sm font-semibold">Legenda do post<textarea className={`${control} mt-2 min-h-56 font-normal`} value={draft.caption} maxLength={2200} onChange={event => updateDraft({ caption: event.target.value })} /><span className="mt-1 block text-xs font-normal text-gray-400">{draft.caption.length}/2.200 caracteres</span></label><button type="button" className={`${button} mt-3`} onClick={() => { updateDraft({ caption: generateSocialCaption(source.post, format) }); setMessage("Legenda atualizada com o padrão editorial e cinco hashtags. Revise antes de publicar."); }}>Aplicar padrão de legenda e hashtags</button></div><div><label className="block text-sm font-semibold">Música sugerida (opcional)<input className={`${control} mt-2 font-normal`} maxLength={200} value={draft.music} onChange={event => updateDraft({ music: event.target.value })} placeholder="Nome da faixa — artista" /></label><p className="mt-3 text-sm leading-6 text-gray-400">Adicione a faixa pelo catálogo do Instagram, se disponível para a conta. O pacote inclui a indicação; as imagens não contêm áudio.</p>{format === 'carousel' && <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-5 accent-brand-orange" disabled={!videoSupported && !draft.coverMotion} checked={Boolean(draft.coverMotion)} onChange={event => updateDraft({ coverMotion: event.target.checked })} /><span><span className="font-semibold">Capa animada</span><span className="mt-1 block leading-6 text-gray-400">{videoSupported ? "A capa vira um vídeo de 5 segundos, sem som, com brilho na imagem e aviso para arrastar. O primeiro quadro é a própria capa." : "Este navegador não gera vídeo H.264. Use o Chrome, o Edge ou o Safari atualizados."}</span></span></label>}<p className="mt-5 text-sm leading-6 text-gray-400">Revise os fatos, a manchete e os créditos. Baixar ou salvar o material não publica no Instagram nem altera a matéria.</p></div></div>
            </fieldset>
          </>}
        </>}
      </section>
    </div>
  </AdminShell>;
}

function PublicationBadge({ value }: { value?: SocialPostListStatus }) {
  const labels = { published: "Publicado no Instagram", processing: "Enviando ao Instagram", unknown: "Confirmar envio no Instagram", failed: "Falha no envio", not_sent: "Sem envio pelo painel", unavailable: "Status indisponível" };
  const status = value?.status;
  const formats = value?.publishedFormats.map(format => format === "single" ? "Imagem única" : "Carrossel").join(" e ");
  return <span className={`mt-2 inline-flex max-w-full items-center gap-1.5 border px-2 py-1 text-xs font-semibold ${status === "published" ? "border-emerald-400/30 text-emerald-300" : status && ["failed", "unknown", "unavailable"].includes(status) ? "border-amber-300/25 text-amber-200" : "border-white/15 text-gray-400"}`} title={formats || undefined}>
    {status === "published" && <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg>}
    {status ? labels[status] : "Conferindo Instagram…"}
  </span>;
}

export default function SocialPostsPage() {
  return <Suspense fallback={<p className="p-8 text-gray-300">Carregando editor…</p>}><SocialPostEditor /></Suspense>;
}
