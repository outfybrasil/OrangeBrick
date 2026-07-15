"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PostCategory } from "@/lib/types/database";

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

        // Verificar autenticação via check-session seguro no servidor
        const sessionRes = await fetch("/api/admin/check-session");
        const sessionData = await sessionRes.json();

        if (!sessionData.isAdmin) {
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
              caption: "Legenda ilustrativa da imagem no meio da matéria.",
            },
            {
              id: "template-body",
              type: "text",
              content: "## Subtítulo Importante\n\nDesenvolva os fatos e argumentos da sua matéria aqui de forma clara e fluida, sem usar negritos artificiais em palavras soltas. Utilize listas para organizar pontos principais:\n\n- Ponto importante 1\n- Ponto importante 2",
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
          const res = await fetch(`/api/admin/posts?id=${postId}`);
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Erro ao carregar matéria");
          
          const post = data.post;
          setTitle(post.title);
          setSlug(post.slug);
          setSummary(post.summary);
          setCategory(post.category as PostCategory);
          setImageUrl(post.image_url || "");
          setImageAlt(post.image_alt || "");
          setAuthorName(post.author_name);
          setAuthorTag(post.author_tag || "");

          // Tentar carregar blocos modulares
          try {
            const parsedBlocks = JSON.parse(post.body);
            if (Array.isArray(parsedBlocks)) {
              setBlocks(parsedBlocks);
            } else {
              // Se não for array, tratar como texto markdown clássico
              setBlocks([{ id: "legacy-block", type: "text", content: post.body }]);
            }
          } catch {
            // Se falhar o parse do JSON, é markdown legado
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
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9\s-]/g, "") // remove caracteres especiais
        .replace(/[\s_]+/g, "-") // substitui espaços por hífen
        .replace(/^-+|-+$/g, ""); // remove hífens do início/fim
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
        id: postId || undefined,
        slug,
        title,
        summary,
        body: JSON.stringify(blocks), // Salvar blocos como string JSON
        category,
        image_url: imageUrl,
        image_alt: imageAlt,
        author_name: authorName,
        author_tag: authorTag,
        is_published: isPublished,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao salvar notícia");

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
