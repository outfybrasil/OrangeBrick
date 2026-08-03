"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import { parseMarkdownToReact } from "@/lib/markdown";
import { AUTHOR_TAGS, normalizeAuthorTag, validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
import { isAdminUser } from "@/lib/auth";
import type { Post, PostCategory, Topic } from "@/lib/types/database";

type ContentBlock = EditorialBlock;
type SidebarTab = "publicacao" | "seo" | "midia" | "historico";
type InformationStatus = Post["information_status"];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const CATEGORY_OPTIONS: { value: PostCategory; label: string }[] = [
  { value: "breaking", label: "Plantão" },
  { value: "review", label: "Review" },
  { value: "hardware", label: "Hardware" },
  { value: "opinion", label: "Opinião" },
  { value: "industry", label: "Indústria" },
  { value: "modding", label: "Modding" },
];

function EditForm() {
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");

  const [slug, setSlug] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<PostCategory>("breaking");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [authorName, setAuthorName] = useState("Redação");
  const [authorTag, setAuthorTag] = useState(AUTHOR_TAGS.breaking);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [informationStatus, setInformationStatus] = useState<InformationStatus>("confirmed");
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [quoteRole, setQuoteRole] = useState("");
  const [quoteSourceUrl, setQuoteSourceUrl] = useState("");
  const [sourcesText, setSourcesText] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("publicacao");

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setHasChanges(true);
    if (!postId && !isEditingSlug) {
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  };

  const editorialChecklist = useMemo(() => {
    const textContent = blocks
      .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.content)
      .join("\n");
    return [
      { id: 1, label: "Título dentro do limite", complete: Boolean(title.trim() && title.length <= 100) },
      { id: 2, label: "Resumo preenchido", complete: summary.trim().length >= 20 },
      { id: 3, label: "Imagem de capa com crédito", complete: Boolean(imageUrl.trim()) },
      { id: 4, label: "Texto alternativo", complete: Boolean(imageAlt.trim().length >= 3) },
      { id: 5, label: "Categoria selecionada", complete: Boolean(category) },
      { id: 6, label: "Revisar links externos", complete: /\*\*Fonte:\*\*/i.test(textContent) || textContent.includes("http") },
      { id: 7, label: "Definir SEO description", complete: summary.trim().length >= 50 },
      { id: 8, label: "Estado da informação definido", complete: Boolean(informationStatus) },
      { id: 9, label: "Citação com autoria e fonte", complete: !quoteText.trim() || Boolean(quoteAuthor.trim() && /^https:\/\//.test(quoteSourceUrl.trim())) },
      { id: 10, label: "Fontes estruturadas", complete: sourcesText.split("\n").filter(Boolean).every((line) => /^.+\|https:\/\//.test(line.trim())) },
    ];
  }, [blocks, category, imageAlt, imageUrl, informationStatus, quoteAuthor, quoteSourceUrl, quoteText, sourcesText, summary, title]);

  const completedChecklistCount = editorialChecklist.filter((item) => item.complete).length;
  const pendingChecklistCount = editorialChecklist.length - completedChecklistCount;

  useEffect(() => {
    if (!hasChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    const warnBeforeInternalNavigation = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || new URL(link.href, window.location.href).origin !== window.location.origin) return;
      if (window.confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", warnBeforeInternalNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("click", warnBeforeInternalNavigation, true);
    };
  }, [hasChanges]);

  useEffect(() => {
    if (!showPreview) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setShowPreview(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showPreview]);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !isAdminUser(user)) {
          router.push("/admin/login");
          return;
        }

        const { data: topicData } = await supabase
          .from("topics")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
        setTopics((topicData || []) as Topic[]);

        if (!postId) {
          const { data: preferences } = await supabase
            .from("admin_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          const storedPreferences = preferences as { default_author?: string; default_category?: PostCategory } | null;
          const nextCategory = storedPreferences?.default_category && CATEGORY_OPTIONS.some((option) => option.value === storedPreferences.default_category)
            ? storedPreferences.default_category
            : "breaking";
          setAuthorName(storedPreferences?.default_author?.trim() || "Redação");
          setCategory(nextCategory);
          setAuthorTag(AUTHOR_TAGS[nextCategory]);
          setIsLoading(false);
          return;
        }

        if (postId) {
          const { data: post, error: fetchError } = await supabase
            .from("posts")
            .select("*")
            .eq("id", postId)
            .single();

          if (fetchError) throw fetchError;

          const typedPost = post as unknown as Post;
          setTitle(typedPost.title);
          setSlug(typedPost.slug);
          setSummary(typedPost.summary);
          setCategory(typedPost.category);
          setTopicId(typedPost.topic_id || "");
          setImageUrl(typedPost.image_url || "");
          setImageAlt(typedPost.image_alt || "");
          setAuthorName(typedPost.author_name);
          setAuthorTag(normalizeAuthorTag(typedPost.author_tag));
          setPublishedAt(typedPost.published_at || null);
          setInformationStatus(typedPost.information_status || "confirmed");
          const storedQuote = typedPost.featured_quote as { text?: string; author?: string; role?: string; source_url?: string } | null;
          setQuoteText(storedQuote?.text || "");
          setQuoteAuthor(storedQuote?.author || "");
          setQuoteRole(storedQuote?.role || "");
          setQuoteSourceUrl(storedQuote?.source_url || "");
          const storedSources = Array.isArray(typedPost.editorial_sources) ? typedPost.editorial_sources as Array<{ name?: string; url?: string }> : [];
          setSourcesText(storedSources.map((source) => `${source.name || "Fonte"}|${source.url || ""}`).join("\n"));
          setCorrectionNote(typedPost.correction_note || "");

          try {
            const parsedBlocks = JSON.parse(typedPost.body);
            if (Array.isArray(parsedBlocks)) {
              setBlocks(parsedBlocks);
            } else {
              setBlocks([{ id: "legacy-block", type: "text", content: typedPost.body }]);
            }
          } catch {
            setBlocks([{ id: "legacy-block", type: "text", content: typedPost.body }]);
          }
        }
      } catch (err: unknown) {
        setError(errorMessage(err, "Erro de inicialização"));
      } finally {
        setIsLoading(false);
      }
    }

    void init();
  }, [postId, router, supabase]);

  const addBlock = (type: "text" | "image" | "heading" | "quote" | "embed") => {
    const id = `block-${Date.now()}`;
    let newBlock: ContentBlock;

    if (type === "image") {
      newBlock = { id, type: "image", url: "", alt: "", caption: "" };
    } else if (type === "heading") {
      newBlock = { id, type: "text", content: "## Novo Subtítulo\n\n" };
    } else if (type === "quote") {
      newBlock = { id, type: "text", content: "> \"Insira sua citação aqui.\"\n\n" };
    } else if (type === "embed") {
      newBlock = { id, type: "text", content: "[youtube](https://youtube.com/...)" };
    } else {
      newBlock = { id, type: "text", content: "" };
    }

    setBlocks(prev => [...prev, newBlock]);
    setHasChanges(true);
  };

  const updateTextBlock = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id && b.type === "text" ? { ...b, content } : b));
    setHasChanges(true);
  };

  const updateImageBlock = (id: string, field: "url" | "alt" | "caption", value: string) => {
    setBlocks(prev => prev.map(b => b.id === id && b.type === "image" ? { ...b, [field]: value } : b));
    setHasChanges(true);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setHasChanges(true);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const copy = [...blocks];
    const item = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = item;
    setBlocks(copy);
    setHasChanges(true);
  };

  const handleSave = async (isPublished: boolean) => {
    try {
      setIsSaving(true);
      setError(null);

      if (!title.trim()) throw new Error("O título é obrigatório");
      if (!slug.trim()) throw new Error("O slug é obrigatório");
      if (isPublished) {
        const parsedSources = sourcesText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
          const separator = line.indexOf("|");
          return { name: separator >= 0 ? line.slice(0, separator).trim() : "", url: separator >= 0 ? line.slice(separator + 1).trim() : "" };
        });
        const validationErrors = validateEditorialContent({ slug, title, summary, imageUrl, imageAlt, blocks, editorialMetadata: {
          informationStatus,
          quote: quoteText.trim() ? { text: quoteText, author: quoteAuthor, role: quoteRole, sourceUrl: quoteSourceUrl } : null,
          sources: parsedSources,
          correctionNote,
        } });
        if (validationErrors.length > 0) throw new Error(validationErrors[0]);
      }

      const bodyJson = JSON.stringify(blocks);
      const editorialSources = sourcesText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const separator = line.indexOf("|");
        return { name: line.slice(0, separator).trim(), url: line.slice(separator + 1).trim() };
      });

      const postData = {
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim(),
        body: bodyJson,
        category,
        topic_id: topicId || null,
        image_url: imageUrl.trim() || null,
        image_alt: imageAlt.trim() || null,
        author_name: authorName,
        author_tag: authorTag,
        is_published: isPublished,
        published_at: isPublished ? (publishedAt || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
        information_status: informationStatus,
        featured_quote: quoteText.trim() ? { text: quoteText.trim(), author: quoteAuthor.trim(), role: quoteRole.trim(), source_url: quoteSourceUrl.trim() } : null,
        editorial_sources: editorialSources,
        correction_note: correctionNote.trim() || null,
      };

      if (postId) {
        const { error: updateErr } = await supabase.from("posts").update(postData).eq("id", postId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("posts").insert([postData]);
        if (insertErr) throw insertErr;
      }

      setHasChanges(false);
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro ao salvar matéria"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0a0b0e] text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-gray-400 text-xs">Carregando editor de matérias...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      active="editor"
      title="Nova matéria"
      description=""
      status={
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {hasChanges ? "Alterações não salvas" : postId ? "Matéria carregada" : "Nova matéria vazia"}
        </span>
      }
      actions={
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="min-h-11 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-xs font-bold text-gray-200 hover:bg-white/[0.08] transition-colors"
          >
            Pré-visualizar
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="min-h-11 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-xs font-bold text-gray-200 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            Salvar rascunho
          </button>

          {/* SPLIT ACTION BUTTON PUBLICAR */}
          <div className="flex items-center rounded-lg bg-brand-orange">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="col-span-2 min-h-11 rounded-lg px-4 text-xs font-bold text-white transition-colors hover:bg-[#ff7526] disabled:opacity-50 sm:col-span-1"
            >
              Publicar matéria
            </button>
          </div>
        </div>
      }
      wide
    >
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* PAINEL PRINCIPAL DE 2 COLUNAS */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">

        {/* ── COLUNA ESQUERDA: EDITOR CANVAS ── */}
        <div className="space-y-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors mb-2"
          >
            ← Voltar para visão geral
          </Link>

          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-5 space-y-5">
            {/* TÍTULO DA MATÉRIA */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mb-1.5">
                <label htmlFor="article-title">Título da matéria</label>
                <span>{title.length} / 100</span>
              </div>
              <input
                id="article-title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={100}
                placeholder="Insira o título da matéria..."
                className="h-11 w-full rounded-lg border border-white/10 bg-background-void px-4 font-heading text-sm font-black uppercase text-white outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>

            {/* RESUMO EDITORIAL */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mb-1.5">
                <label htmlFor="article-summary">Resumo editorial</label>
                <div className="flex items-center gap-1.5">
                  <span>{summary.length} / 200</span>
                  {summary.length >= 20 && <span className="text-emerald-400">✓</span>}
                </div>
              </div>
              <textarea
                id="article-summary"
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setHasChanges(true); }}
                maxLength={200}
                rows={3}
                placeholder="Insira uma breve descrição da matéria..."
                className="w-full rounded-lg border border-white/10 bg-background-void p-3 text-xs text-gray-200 outline-none focus:border-brand-orange/50 transition-colors leading-relaxed"
              />
            </div>

            {/* SLUG */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                <span>Slug</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-background-void px-3 py-2 text-xs">
                <span className="truncate font-mono text-gray-400">
                  orangebrick.com.br/noticias/<span className="text-white font-bold">{slug}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(!isEditingSlug)}
                  className="text-gray-400 hover:text-white text-xs shrink-0"
                >
                  ✎
                </button>
              </div>
              {isEditingSlug && (
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setHasChanges(true); }}
                  className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-background-void px-3 text-xs font-mono text-white outline-none focus:border-brand-orange/50"
                />
              )}
            </div>

            {/* LISTA DE BLOCOS DO CORPO */}
            <div className="space-y-4 pt-2">
              {blocks.map((block, index) => (
                <div key={block.id} className="group relative flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.01] p-2 hover:border-white/10 transition-colors">
                  {/* ALÇA DE ARRASTAR */}
                  <div className="flex flex-col items-center gap-1 pt-2 text-gray-600 opacity-50 group-hover:opacity-100 cursor-grab">
                    <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0} className="hover:text-white disabled:opacity-20 text-[10px]">▲</button>
                    <span className="text-xs">⋮⋮</span>
                    <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blocks.length - 1} className="hover:text-white disabled:opacity-20 text-[10px]">▼</button>
                  </div>

                  {/* CONTEÚDO DO BLOCO */}
                  <div className="flex-1 min-w-0">
                    {block.type === "text" ? (
                      <textarea
                        value={block.content}
                        onChange={(e) => updateTextBlock(block.id, e.target.value)}
                        rows={Math.max(2, block.content.split("\n").length)}
                        placeholder="Digite o texto do parágrafo ou markdown..."
                        className="w-full bg-transparent p-2 text-xs leading-relaxed text-gray-200 outline-none font-sans"
                      />
                    ) : (
                      <div className="space-y-2 p-2">
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-void border border-white/10">
                          {block.url ? (
                            <img src={block.url} alt={block.alt} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-600">
                              <span className="text-xl">📷</span>
                              <span className="text-[10px]">Insira a URL da imagem abaixo</span>
                            </div>
                          )}
                        </div>
                        <input
                          type="url"
                          value={block.url}
                          onChange={(e) => updateImageBlock(block.id, "url", e.target.value)}
                          placeholder="URL da imagem (https://...)"
                          className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white font-mono outline-none"
                        />
                        <input
                          type="text"
                          value={block.caption}
                          onChange={(e) => updateImageBlock(block.id, "caption", e.target.value)}
                          placeholder="Legenda da imagem..."
                          className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-gray-300 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* BOTÃO DE REMOVER BLOCO */}
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors text-xs"
                    title="Remover bloco"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* BOTÕES DE ADICIONAR BLOCOS NO RODAPÉ */}
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/10 flex-wrap">
              <button
                type="button"
                onClick={() => addBlock("text")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Texto
              </button>
              <button
                type="button"
                onClick={() => addBlock("image")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Imagem
              </button>
              <button
                type="button"
                onClick={() => addBlock("heading")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Título
              </button>
              <button
                type="button"
                onClick={() => addBlock("quote")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Citação
              </button>
              <button
                type="button"
                onClick={() => addBlock("embed")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Embed
              </button>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: SIDEBAR DE CONFIGURAÇÕES E CHECKLIST ── */}
        <aside className="space-y-4">
          {/* ABAS SUPERIORES */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0e0f14] rounded-t-xl px-2 pt-2">
            {(["publicacao", "seo", "midia", "historico"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSidebarTab(tab)}
                className={`pb-2 text-xs font-bold capitalize transition-colors relative ${
                  activeSidebarTab === tab ? "text-brand-orange" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "publicacao" ? "Publicação" : tab === "seo" ? "SEO" : tab === "midia" ? "Mídia" : "Histórico"}
                {activeSidebarTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-orange" />}
              </button>
            ))}
          </div>

          {/* PAINEL DE PUBLICAÇÃO */}
          <div className="rounded-b-xl border-x border-b border-white/10 bg-[#0e0f14] p-4 space-y-4">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Publicação</h3>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Status</label>
                <div className="inline-block rounded border border-white/15 bg-background-void px-2.5 py-1.5 text-xs font-bold text-gray-300">
                  {publishedAt ? "Publicada" : "Rascunho"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Responsável</label>
                <select
                  value={authorName}
                  onChange={(e) => { setAuthorName(e.target.value); setHasChanges(true); }}
                  className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none"
                >
                  <option value="Gustavo">👤 Gustavo</option>
                  <option value="Marina">👤 Marina</option>
                  <option value="Caio">👤 Caio</option>
                  <option value="Redação">👤 Redação</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value as PostCategory); setHasChanges(true); }}
                className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>🏷️ {opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">Tópicos</label>
              <select
                value={topicId}
                onChange={(event) => { setTopicId(event.target.value); setHasChanges(true); }}
                className="h-9 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none"
              >
                <option value="">Nenhum tópico</option>
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="information-status" className="mb-1 block text-[10px] font-bold text-gray-500">Estado da informação</label>
              <select id="information-status" value={informationStatus} onChange={(event) => { setInformationStatus(event.target.value as InformationStatus); setHasChanges(true); }} className="h-9 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none focus:border-brand-orange/50">
                <option value="confirmed">Confirmada</option>
                <option value="developing">Em desenvolvimento</option>
                <option value="rumor">Rumor não confirmado</option>
                <option value="updated">Atualizada</option>
                <option value="corrected">Corrigida</option>
              </select>
            </div>

            {(informationStatus === "corrected" || correctionNote) && <div>
              <label htmlFor="correction-note" className="mb-1 block text-[10px] font-bold text-gray-500">Nota de correção</label>
              <textarea id="correction-note" value={correctionNote} onChange={(event) => { setCorrectionNote(event.target.value); setHasChanges(true); }} rows={3} maxLength={500} placeholder="Explique com clareza o que foi corrigido." className="w-full rounded border border-white/10 bg-background-void p-2 text-xs leading-relaxed text-white outline-none focus:border-brand-orange/50" />
            </div>}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div><h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Fala em destaque</h3><p className="mt-1 text-[10px] leading-relaxed text-gray-500">A fala só será exibida com autoria e URL da fonte.</p></div>
            <textarea value={quoteText} onChange={(event) => { setQuoteText(event.target.value); setHasChanges(true); }} rows={4} maxLength={500} placeholder="Declaração exata, sem aspas" className="w-full rounded border border-white/10 bg-background-void p-2 text-xs text-white outline-none focus:border-brand-orange/50" />
            <div className="grid gap-2 xs:grid-cols-2"><input value={quoteAuthor} onChange={(event) => { setQuoteAuthor(event.target.value); setHasChanges(true); }} placeholder="Nome da pessoa" className="h-9 rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none" /><input value={quoteRole} onChange={(event) => { setQuoteRole(event.target.value); setHasChanges(true); }} placeholder="Cargo ou função" className="h-9 rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none" /></div>
            <input type="url" value={quoteSourceUrl} onChange={(event) => { setQuoteSourceUrl(event.target.value); setHasChanges(true); }} placeholder="https://fonte-da-declaracao.com" className="h-9 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none" />
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div><h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Fontes consultadas</h3><p className="mt-1 text-[10px] leading-relaxed text-gray-500">Uma por linha no formato Nome|https://endereco.com</p></div>
            <textarea value={sourcesText} onChange={(event) => { setSourcesText(event.target.value); setHasChanges(true); }} rows={5} spellCheck={false} placeholder={"Xbox Wire|https://news.xbox.com\nVGC|https://videogameschronicle.com"} className="w-full rounded border border-white/10 bg-background-void p-2 font-mono text-[11px] leading-relaxed text-white outline-none focus:border-brand-orange/50" />
          </div>

          {/* WIDGET IMAGEM DE CAPA */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Imagem de capa</h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-void border border-white/10">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-600">Sem imagem de capa</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setHasChanges(true); }}
                placeholder="URL da imagem..."
                className="h-8 flex-1 rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="h-8 px-2.5 text-[11px] font-bold text-red-400 hover:bg-red-500/10 rounded border border-red-500/20"
              >
                Remover
              </button>
            </div>
            <input
              type="text"
              value={imageAlt}
              onChange={(event) => { setImageAlt(event.target.value); setHasChanges(true); }}
              placeholder="Descreva a imagem de capa"
              className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none"
            />
          </div>

          {/* CHECKLIST EDITORIAL */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-bold text-white">Checklist editorial</h3>
              <span className="text-xs font-bold text-brand-orange">{completedChecklistCount} de {editorialChecklist.length}</span>
            </div>

            {/* BARRA DE PROGRESSO DO CHECKLIST */}
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-orange transition-[width] duration-500"
                style={{ width: `${(completedChecklistCount / editorialChecklist.length) * 100}%` }}
              />
            </div>

            <div className="space-y-1.5 text-xs">
              {editorialChecklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className={item.complete ? "text-emerald-400" : "text-gray-600"}>
                    {item.complete ? "✓" : "○"}
                  </span>
                  <span className={item.complete ? "text-gray-300" : "text-gray-500"}>{item.label}</span>
                </div>
              ))}
            </div>

            {pendingChecklistCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200 flex items-center gap-2">
                <span>⚠️</span>
                <span>{pendingChecklistCount} itens precisam de atenção antes de publicar</span>
              </div>
            )}
          </div>

        </aside>
      </div>

      {/* MODAL DE PREVIEW */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowPreview(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" className="max-h-[calc(100dvh-1rem)] w-full max-w-4xl space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-[#0e0f14] p-4 text-white sm:max-h-[90vh] sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="preview-dialog-title" className="font-heading text-lg font-bold">Pré-visualização da Matéria</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="min-h-11 min-w-11 text-gray-400 hover:text-white" aria-label="Fechar pré-visualização">✕</button>
            </div>
            <h1 className="font-heading text-2xl font-black">{title}</h1>
            <p className="text-sm text-gray-300 leading-relaxed italic">{summary}</p>
            {imageUrl && <img src={imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg" />}
            <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-4">
              {blocks.map(b => (
                <div key={b.id}>
                  {b.type === "text" ? parseMarkdownToReact(b.content) : (
                    <div>
                      {b.url && <img src={b.url} alt={b.alt} className="w-full aspect-video object-cover rounded-lg" />}
                      {b.caption && <p className="text-xs text-center text-gray-500 mt-1">{b.caption}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0a0b0e]" />}>
      <EditForm />
    </Suspense>
  );
}
