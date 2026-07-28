"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { parseMarkdownToReact } from "@/lib/markdown";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { AUTHOR_TAGS, normalizeAuthorTag, validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
import { isAdminUser } from "@/lib/auth";
import type { Post, PostCategory, Topic } from "@/lib/types/database";

type ContentBlock = EditorialBlock;
type SidebarTab = "publicacao" | "seo" | "midia" | "historico";

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
  const [authorName, setAuthorName] = useState("Gustavo");
  const [authorTag, setAuthorTag] = useState(AUTHOR_TAGS.breaking);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
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
    const imageBlocks = blocks.filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image");
    const imageUrls = [imageUrl, ...imageBlocks.map((block) => block.url)].filter(Boolean);

    return [
      { id: 1, label: "Título dentro do limite", complete: Boolean(title.trim() && title.length <= 100) },
      { id: 2, label: "Resumo preenchido", complete: summary.trim().length >= 20 },
      { id: 3, label: "Imagem de capa com crédito", complete: Boolean(imageUrl.trim()) },
      { id: 4, label: "Texto alternativo", complete: Boolean(imageAlt.trim().length >= 3) },
      { id: 5, label: "Categoria selecionada", complete: Boolean(category) },
      { id: 6, label: "Revisar links externos", complete: /\*\*Fonte:\*\*/i.test(textContent) || textContent.includes("http") },
      { id: 7, label: "Definir SEO description", complete: summary.trim().length >= 50 },
    ];
  }, [blocks, category, imageAlt, imageUrl, summary, title]);

  const completedChecklistCount = editorialChecklist.filter((item) => item.complete).length;
  const pendingChecklistCount = editorialChecklist.length - completedChecklistCount;

  useEffect(() => {
    if (!hasChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasChanges]);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!isAdminUser(user)) {
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
          setAuthorName("Gustavo");
          setAuthorTag(AUTHOR_TAGS.breaking);
          setTitle("FINAL FANTASY XIV REVELA BASTION E DATA NO SWITCH 2");
          setSlug("final-fantasy-xiv-bastion-switch-2");
          setSummary("Square Enix apresentou Bastion, nova classe tanque de Evercold, e confirmou lançamento de Final Fantasy XIV no Nintendo Switch 2. Veja todos os detalhes revelados.");
          setImageUrl("https://www.gamereactor.pt/media/25/wreckreation2preview_4952523b.jpg");
          setImageAlt("Bastion será a nova classe tanque de Evercold");
          setBlocks([
            {
              id: "b1",
              type: "text",
              content: "Durante a mais recente *Live Letter*, a Square Enix surpreendeu os fãs de MMORPG ao revelar *Bastion*, a nova classe tanque que chegará na próxima expansão Evercold de Final Fantasy XIV. Além disso, a empresa confirmou que o jogo será lançado oficialmente para o Nintendo Switch 2."
            },
            {
              id: "b2",
              type: "image",
              url: "https://www.gamereactor.pt/media/25/wreckreation2preview_4952523b.jpg",
              alt: "Bastion em ação no FFXIV",
              caption: "Bastion será a nova classe tanque de Evercold."
            },
            {
              id: "b3",
              type: "text",
              content: "## O que sabemos até agora\n\nBastion será uma classe focada em defesa e controle de grupo, trazendo mecânicas inéditas para a função tanque. A expansão *Evercold* está prevista para o inverno de 2025 e promete uma nova área, masmorras, raids e muito mais.\n\n**Principais destaques da revelação:**\n- Nova classe tanque: Bastion\n- Expansão Evercold chega no inverno de 2025\n- Lançamento de Final Fantasy XIV no Nintendo Switch 2\n- Melhorias gráficas e desempenho otimizados\n\n> \"Levar FFXIV para o Switch 2 é um sonho que se torna realidade. Queremos que ainda mais jogadores possam embarcar nesta jornada, onde quer que estejam.\" — *Naoki Yoshida, produtor e diretor de FFXIV*\n\n---\n\n**Fonte:** [Square Enix Official Press](https://finalfantasyxiv.com)"
            }
          ]);
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

      const bodyJson = JSON.stringify(blocks);

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
          Salvo agora
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="h-9 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-xs font-bold text-gray-200 hover:bg-white/[0.08] transition-colors"
          >
            Pré-visualizar
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="h-9 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-xs font-bold text-gray-200 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            Salvar rascunho
          </button>

          {/* SPLIT ACTION BUTTON PUBLICAR */}
          <div className="flex items-center rounded-lg bg-brand-orange">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="h-9 rounded-l-lg px-4 text-xs font-bold text-white transition-colors hover:bg-[#ff7526] disabled:opacity-50"
            >
              Publicar matéria
            </button>
            <span className="h-4 w-px bg-white/20" />
            <button
              type="button"
              className="h-9 px-2 text-xs text-white hover:bg-[#ff7526] rounded-r-lg"
              title="Mais opções de publicação"
            >
              ▾
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

            {/* TOOLBAR DO EDITOR DE BLOCOS */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] p-1.5 text-xs text-gray-300">
              <select className="h-8 rounded border border-white/10 bg-[#0e0f14] px-2 text-xs font-semibold text-gray-300 outline-none">
                <option>Parágrafo</option>
                <option>Subtítulo (H2)</option>
                <option>Sub-subtítulo (H3)</option>
              </select>
              <span className="h-4 w-px bg-white/10 mx-1" />
              <button type="button" className="h-8 w-8 rounded font-bold hover:bg-white/10 hover:text-white" title="Negrito">B</button>
              <button type="button" className="h-8 w-8 rounded italic hover:bg-white/10 hover:text-white" title="Itálico">I</button>
              <button type="button" className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Link">🔗</button>
              <button type="button" className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Citação">❝</button>
              <span className="h-4 w-px bg-white/10 mx-1" />
              <button type="button" className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Lista sem ordem">≡</button>
              <button type="button" className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Lista numerada">≡</button>
              <span className="h-4 w-px bg-white/10 mx-1" />
              <button type="button" onClick={() => addBlock("image")} className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Inserir imagem">📷</button>
              <button type="button" onClick={() => addBlock("embed")} className="h-8 w-8 rounded hover:bg-white/10 hover:text-white" title="Inserir embed">🎥</button>
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
                className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Texto
              </button>
              <button
                type="button"
                onClick={() => addBlock("image")}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Imagem
              </button>
              <button
                type="button"
                onClick={() => addBlock("heading")}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Título
              </button>
              <button
                type="button"
                onClick={() => addBlock("quote")}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Citação
              </button>
              <button
                type="button"
                onClick={() => addBlock("embed")}
                className="h-8 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
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

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Agendamento</label>
                <select className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none">
                  <option>📅 Publicar agora</option>
                  <option>📅 Agendar data</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Visibilidade</label>
                <select className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none">
                  <option>🌐 Público</option>
                  <option>🔒 Privado</option>
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
              <div className="flex flex-wrap gap-1.5">
                {["Final Fantasy", "Switch 2", "MMORPG"].map((tag) => (
                  <span key={tag} className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
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
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <span>✓</span> Texto alternativo preenchido
            </div>
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

          {/* CRÉDITOS E AUTORIA */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Créditos e autoria</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Autor</label>
                <select className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none">
                  <option>The Brick</option>
                  <option>Gustavo</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Fonte</label>
                <select className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none">
                  <option>Portal oficial</option>
                  <option>Comunicado</option>
                </select>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL DE PREVIEW */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-white/10 bg-[#0e0f14] p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-lg font-bold">Pré-visualização da Matéria</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white">✕</button>
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
