"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseInlineMarkdown } from "@/lib/markdown";
import type { Post, PostCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";

type ContentBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string };

function EditForm() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");

  // Metadados do Post
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<PostCategory>("breaking");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [authorName, setAuthorName] = useState("Redação");
  const [authorTag, setAuthorTag] = useState("");

  // Editor Modular por Blocos
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Estados de Carregamento e Erro
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Validar Admin e carregar Post (se for edição)
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();

        if (!user?.user_metadata?.is_admin) {
          router.push("/admin/login");
          return;
        }

        if (!postId) {
          setAuthorName("The Brick");
          setAuthorTag("Mistério");
          setBlocks([
            {
              id: "template-intro",
              type: "text",
              content: "Insira aqui o parágrafo de introdução da sua matéria. Apresente os fatos principais de forma direta e impactante.",
            },
            {
              id: "template-image",
              type: "image",
              url: "",
              alt: "",
              caption: "Legenda da primeira imagem ilustrativa da matéria.",
            },
            {
              id: "template-body",
              type: "text",
              content: "## Subtítulo Importante\n\nDesenvolva os fatos e argumentos da sua matéria aqui de forma clara e fluida, sem usar negritos artificiais em palavras soltas. Utilize listas para organizar pontos principais:\n\n- Ponto importante 1\n- Ponto importante 2",
            },
            {
              id: "template-image-2",
              type: "image",
              url: "",
              alt: "",
              caption: "Legenda da segunda imagem — diferente da primeira, mostre outro ângulo ou conceito.",
            },
            {
              id: "template-conclusion",
              type: "text",
              content: "## O que você pensa sobre isso?\n\nEscreva sua conclusão e faça uma pergunta instigante para convidar os leitores a debaterem na seção de comentários abaixo!\n\n---\n\nFonte: [Nome da Fonte](https://url-da-fonte.com)",
            }
          ]);
          setIsLoading(false);
          return;
        }

        if (postId) {
          const { data: post, error: fetchError } = await (supabase as any)
            .from("posts")
            .select("*")
            .eq("id", postId)
            .single();

          if (fetchError) throw fetchError;

          setTitle(post.title);
          setSlug(post.slug);
          setSummary(post.summary);
          setCategory(post.category as PostCategory);
          setImageUrl(post.image_url || "");
          setImageAlt(post.image_alt || "");
          setAuthorName(post.author_name);
          setAuthorTag(post.author_tag || "");

          try {
            const parsedBlocks = JSON.parse(post.body);
            if (Array.isArray(parsedBlocks)) {
              setBlocks(parsedBlocks);
            } else {
              setBlocks([{ id: "legacy-block", type: "text", content: post.body }]);
            }
          } catch {
            setBlocks([{ id: "legacy-block", type: "text", content: post.body }]);
          }
        }
      } catch (err: any) {
        setError(err.message || "Erro de inicialização");
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [router, postId]);

  // Auxiliar para gerar slug a partir do título
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!postId) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  };

  // Gerenciamento de Blocos
  const addTextBlock = () => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substring(2, 9),
      type: "text",
      content: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const addImageBlock = () => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substring(2, 9),
      type: "image",
      url: "",
      alt: "",
      caption: "",
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlockValue = (id: string, field: string, value: string) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)) as ContentBlock[]
    );
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  // Salvar Postagem
  const handleSave = async (isPublished: boolean) => {
    if (!title || !slug || !summary || !category) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (blocks.length === 0) {
      setError("Adicione pelo menos um bloco de conteúdo (texto ou imagem).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        slug,
        title,
        summary,
        body: JSON.stringify(blocks),
        category,
        image_url: imageUrl || null,
        image_alt: imageAlt || null,
        author_name: authorName || "Redação",
        author_tag: authorTag || null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      };

      if (postId) {
        const { error: updateError } = await (supabase as any)
          .from("posts")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from("posts")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao salvar");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-gray-400">Verificando sessão e carregando editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-void text-white font-mono text-sm pb-24">
      {/* Top Header */}
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-lg font-black uppercase">
              Orange<span className="text-brand-orange">_</span>Brick <span className="text-xs text-gray-500 font-normal">/ editor</span>
            </h1>
          </div>
          <button
            onClick={() => router.push("/admin")}
            className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors border border-white/10 px-3 py-1.5 rounded-lg"
          >
            ← Cancelar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Metadados */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl p-6 space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange border-b border-brand-orange-muted/10 pb-2">
                Metadados do Post
              </h3>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Título da Notícia *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder="Título atraente..."
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  URL Amigável (Slug) *
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="titulo-da-noticia"
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                >
                  <option value="breaking">Breaking</option>
                  <option value="review">Review</option>
                  <option value="hardware">Hardware</option>
                  <option value="opinion">Opinião</option>
                  <option value="industry">Indústria</option>
                  <option value="modding">Modding</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Resumo / Subtítulo *
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                  maxLength={280}
                  rows={3}
                  placeholder="Resumo breve para o feed de notícias (máx. 280 caracteres)..."
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Imagem de Capa (URL)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Alt da Imagem de Capa
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Descrição da imagem..."
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Seu nome..."
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                  Tag do Autor (Ex: 🔥 Opinião)
                </label>
                <input
                  type="text"
                  value={authorTag}
                  onChange={(e) => setAuthorTag(e.target.value)}
                  placeholder="🛠️ Hard News"
                  className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {isSaving ? "Salvando..." : "Publicar Notícia"}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="w-full bg-card-slate/60 hover:bg-card-slate text-gray-300 font-bold py-3 rounded-lg border border-brand-orange-muted/10 hover:border-brand-orange/20 transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {isSaving ? "Salvando..." : "Salvar como Rascunho"}
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="w-full bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue font-bold py-3 rounded-lg border border-accent-blue/20 hover:border-accent-blue/40 transition-all cursor-pointer text-center"
              >
                👁️ Visualizar Matéria
              </button>
            </div>
          </div>

          {/* Coluna da Direita: Editor Modular por Blocos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl p-6 min-h-[500px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-brand-orange-muted/10 pb-3 mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                    Corpo da Matéria (Editor de Blocos)
                  </h3>
                  <span className="text-[10px] text-gray-500">
                    {blocks.length} bloco(s) adicionado(s)
                  </span>
                </div>

                {/* Lista de Blocos */}
                <div className="space-y-6">
                  {blocks.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 font-sans border border-dashed border-brand-orange-muted/10 rounded-xl">
                      Crie blocos modulares abaixo para montar sua matéria de forma personalizada.
                    </div>
                  ) : (
                    blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className="relative bg-background-void border border-brand-orange-muted/10 rounded-xl p-5 group hover:border-brand-orange-muted/30 transition-colors"
                      >
                        {/* Controles do Bloco */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveBlock(index, "up")}
                            disabled={index === 0}
                            title="Mover para cima"
                            className="p-1 rounded bg-card-slate hover:bg-brand-orange/10 hover:text-brand-orange text-gray-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveBlock(index, "down")}
                            disabled={index === blocks.length - 1}
                            title="Mover para baixo"
                            className="p-1 rounded bg-card-slate hover:bg-brand-orange/10 hover:text-brand-orange text-gray-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeBlock(block.id)}
                            title="Excluir Bloco"
                            className="p-1 rounded bg-card-slate hover:bg-red-500/10 hover:text-red-400 text-gray-400 cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Bloco Label */}
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-card-slate px-2 py-0.5 rounded border border-white/5">
                            Bloco {index + 1} — {block.type === "text" ? "Texto" : "Imagem"}
                          </span>
                        </div>

                        {/* Campos específicos do Bloco */}
                        {block.type === "text" ? (
                          <textarea
                            value={block.content}
                            onChange={(e) => updateBlockValue(block.id, "content", e.target.value)}
                            rows={6}
                            placeholder="Escreva seu parágrafo ou conteúdo em Markdown aqui..."
                            className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg p-3 outline-none focus:border-brand-orange/30 transition-colors font-sans text-sm leading-relaxed"
                          />
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">
                                URL da Imagem do Bloco *
                              </label>
                              <input
                                type="url"
                                value={block.url}
                                onChange={(e) => updateBlockValue(block.id, "url", e.target.value)}
                                placeholder="https://exemplo.com/imagem-materia.png"
                                className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/30 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">
                                Texto Alternativo (Alt) *
                              </label>
                              <input
                                type="text"
                                value={block.alt}
                                onChange={(e) => updateBlockValue(block.id, "alt", e.target.value)}
                                placeholder="Descrição da imagem..."
                                className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/30 transition-colors"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botões para Adicionar Bloco */}
              <div className="flex items-center gap-4 border-t border-brand-orange-muted/10 pt-6 mt-8">
                <button
                  onClick={addTextBlock}
                  className="flex-1 bg-card-slate/60 hover:bg-brand-orange/10 hover:text-brand-orange text-gray-300 border border-brand-orange-muted/15 hover:border-brand-orange/30 py-3 rounded-lg font-bold transition-all cursor-pointer text-xs text-center"
                >
                  + Adicionar Texto (MD)
                </button>
                <button
                  onClick={addImageBlock}
                  className="flex-1 bg-card-slate/60 hover:bg-brand-orange/10 hover:text-brand-orange text-gray-300 border border-brand-orange-muted/15 hover:border-brand-orange/30 py-3 rounded-lg font-bold transition-all cursor-pointer text-xs text-center"
                >
                  + Adicionar Imagem
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background-void/95 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background-void/90 backdrop-blur-md py-3 z-10">
              <h2 className="text-sm font-mono font-bold text-brand-orange uppercase tracking-wider">
                👁️ Preview da Matéria
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-xs text-gray-400 hover:text-white border border-gray-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Fechar Preview
              </button>
            </div>

            <article className="space-y-6">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border rounded-md ${(CATEGORY_CONFIG[category] || CATEGORY_CONFIG.breaking).color}`}
                >
                  {(CATEGORY_CONFIG[category] || CATEGORY_CONFIG.breaking).label}
                </span>
                <span className="text-[11px] font-mono text-brand-orange-muted">agora mesmo</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase leading-tight">
                {title || "Título da Matéria"}
              </h1>

              <p className="text-base text-gray-400 font-sans border-l-2 border-brand-orange pl-4 py-1 leading-relaxed">
                {summary || "Resumo da matéria..."}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-500 py-2 border-y border-brand-orange-muted/10">
                <span>
                  Por <span className="text-white font-bold">{authorName || "Redação"}</span>
                </span>
                {authorTag && (
                  <>
                    <span>•</span>
                    <span className="text-brand-orange-muted font-bold">{authorTag}</span>
                  </>
                )}
              </div>

              {imageUrl && (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-brand-orange-muted/15 shadow-xl my-6">
                  <img
                    src={imageUrl}
                    alt={imageAlt || title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="mt-8 space-y-6">
                {blocks.map((block) => {
                  if (block.type === "text") {
                    return (
                      <div key={block.id}>
                        {block.content.split("\n").map((line, i) => {
                          const t = line.trim();
                          if (t.startsWith("### ")) return <h3 key={i} className="text-lg font-mono font-bold text-white mt-6 mb-3 uppercase tracking-tight">{parseInlineMarkdown(t.slice(4))}</h3>;
                          if (t.startsWith("## ")) return <h2 key={i} className="text-xl font-mono font-bold text-white mt-8 mb-4 uppercase tracking-tight border-b border-brand-orange-muted/10 pb-2">{parseInlineMarkdown(t.slice(3))}</h2>;
                          if (t.startsWith("# ")) return <h1 key={i} className="text-2xl font-mono font-black text-white mt-10 mb-6 uppercase tracking-tight">{parseInlineMarkdown(t.slice(2))}</h1>;
                          if (t === "") return <div key={i} className="h-4" />;
                          return <p key={i} className="text-gray-300 font-sans text-base leading-relaxed my-4">{parseInlineMarkdown(t)}</p>;
                        })}
                      </div>
                    );
                  }
                  if (block.type === "image") {
                    return (
                      <div key={block.id} className="my-8 flex flex-col gap-2">
                        {block.url ? (
                          <>
                            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-brand-orange-muted/10 shadow-lg">
                              <img src={block.url} alt={block.alt || "Imagem da matéria"} className="w-full h-full object-cover" />
                            </div>
                            {block.caption && (
                              <span className="text-xs text-gray-500 font-mono text-center">{block.caption}</span>
                            )}
                          </>
                        ) : (
                          <div className="aspect-video w-full rounded-xl border border-dashed border-brand-orange-muted/20 bg-card-slate/20 flex items-center justify-center">
                            <span className="text-xs text-gray-500 font-mono">[ Imagem não inserida ]</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEdit() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
          Carregando editor...
        </div>
      }
    >
      <EditForm />
    </Suspense>
  );
}
