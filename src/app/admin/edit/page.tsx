"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseInlineMarkdown } from "@/lib/markdown";
import type { Post, PostCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

type ContentBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string };

const CATEGORY_OPTIONS: { value: PostCategory; label: string; icon: string }[] = [
  { value: "breaking", label: "Breaking", icon: "⚡" },
  { value: "review", label: "Review", icon: "🎮" },
  { value: "hardware", label: "Hardware", icon: "🛠️" },
  { value: "opinion", label: "Opinião", icon: "🔥" },
  { value: "industry", label: "Indústria", icon: "📡" },
  { value: "modding", label: "Modding", icon: "🔧" },
];

function BlockIcon({ type }: { type: "text" | "image" }) {
  return type === "text" ? (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function EditForm() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<PostCategory>("breaking");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [authorName, setAuthorName] = useState("Redação");
  const [authorTag, setAuthorTag] = useState("");

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
            { id: "template-intro", type: "text", content: "Insira aqui o parágrafo de introdução da sua matéria. Apresente os fatos principais de forma direta e impactante." },
            { id: "template-image", type: "image", url: "", alt: "", caption: "Legenda da primeira imagem ilustrativa da matéria." },
            { id: "template-body", type: "text", content: "## Subtítulo Importante\n\nDesenvolva os fatos e argumentos da sua matéria aqui de forma clara e fluida. Utilize listas para organizar pontos principais:\n\n- Ponto importante 1\n- Ponto importante 2" },
            { id: "template-image-2", type: "image", url: "", alt: "", caption: "Legenda da segunda imagem — diferente da primeira, mostre outro ângulo ou conceito." },
            { id: "template-conclusion", type: "text", content: "## O que você pensa sobre isso?\n\nEscreva sua conclusão e faça uma pergunta instigante para convidar os leitores a debaterem nos comentários!\n\n---\n\n**Fonte:** [Nome da Fonte](https://url-da-fonte.com)" },
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

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setHasChanges(true);
    if (!postId) {
      const generatedSlug = val
        .toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setHasChanges(true);
  };

  const addTextBlock = () => {
    const newBlock: ContentBlock = { id: Math.random().toString(36).substring(2, 9), type: "text", content: "" };
    setBlocks([...blocks, newBlock]);
    setHasChanges(true);
  };

  const addImageBlock = () => {
    const newBlock: ContentBlock = { id: Math.random().toString(36).substring(2, 9), type: "image", url: "", alt: "", caption: "" };
    setBlocks([...blocks, newBlock]);
    setHasChanges(true);
  };

  const updateBlockValue = (id: string, field: string, value: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)) as ContentBlock[]);
    setHasChanges(true);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    setHasChanges(true);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setHasChanges(true);
  };

  const handleDuplicate = async () => {
    if (!title || !slug || !summary) return;
    setIsSaving(true);
    setError(null);
    try {
      const dupSlug = slug + "-copy-" + Date.now().toString(36);
      const dupTitle = title + " (cópia)";
      const { data, error: insertError } = await (supabase as any)
        .from("posts")
        .insert({
          slug: dupSlug, title: dupTitle, summary,
          body: JSON.stringify(blocks), category,
          image_url: imageUrl || null, image_alt: imageAlt || null,
          author_name: authorName || "Redação", author_tag: authorTag || null,
          is_published: false, published_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })
        .select().single();
      if (insertError) throw insertError;
      router.push(`/admin/edit?id=${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao duplicar matéria");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (isPublished: boolean) => {
    if (!title || !slug || !summary || !category) {
      setError("Preencha todos os campos obrigatórios.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (blocks.length === 0) {
      setError("Adicione pelo menos um bloco de conteúdo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        slug, title, summary, body: JSON.stringify(blocks), category,
        image_url: imageUrl || null, image_alt: imageAlt || null,
        author_name: authorName || "Redação", author_tag: authorTag || null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      };
      let savedPost: any = null;
      if (postId) {
        const { data, error: updateError } = await (supabase as any)
          .from("posts").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", postId).select().single();
        if (updateError) throw updateError;
        savedPost = data;
      } else {
        const { data, error: insertError } = await (supabase as any)
          .from("posts").insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
        if (insertError) throw insertError;
        savedPost = data;
      }
      if (isPublished && savedPost) {
        const np = { title: savedPost.title, slug: savedPost.slug, category: savedPost.category };
        fetch("/api/notify-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(np) })
          .catch(() => {
            const su = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
            const ak = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
            fetch(`${su}/functions/v1/send-push-notification`, {
              method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ak}` },
              body: JSON.stringify({
                title: `🧱 ${np.title}`, body: `Nova matéria em ${np.category}`,
                url: `${siteUrl}${basePath}/post?slug=${np.slug}`,
              }),
            }).catch(() => {});
          });
      }
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
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
    <div className="min-h-dvh bg-background-void text-white font-mono text-sm">
      {/* ====== TOP HEADER ====== */}
      <header className="sticky top-0 z-40 border-b border-brand-orange-muted/10 bg-card-slate/90 backdrop-blur-md py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-8 w-auto object-contain" />
            <div>
              <h1 className="text-base font-black uppercase leading-tight">
                Orange<span className="text-brand-orange">_</span>Brick <span className="text-[10px] text-gray-500 font-normal">/ editor</span>
              </h1>
              {hasChanges && <span className="text-[9px] text-yellow-400">* alterações não salvas</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="text-xs text-accent-blue hover:text-white border border-accent-blue/30 px-3 py-1.5 rounded-lg hover:bg-accent-blue/10 transition-all cursor-pointer"
            >
              👁️ Preview
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        {/* ====== METADATA SECTION ====== */}
        <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl overflow-hidden mb-8">
          <div className="border-b border-brand-orange-muted/10 bg-card-slate/30 px-6 py-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Informações da Matéria
            </h2>
            <span className="text-[9px] text-gray-500 uppercase">{postId ? "Editando" : "Nova"}</span>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            {/* Título */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Título da Notícia *</span>
                <span className={`text-[9px] ${title.length > 65 ? "text-red-400" : "text-gray-500"}`}>{title.length}/70</span>
              </label>
              <input
                type="text" value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título atraente (máx. 70 caracteres)..."
                maxLength={70}
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-4 py-3 outline-none focus:border-brand-orange/50 transition-colors text-sm font-bold"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">URL Amigável (Slug) *</label>
              <input
                type="text" value={slug}
                onChange={(e) => { setSlug(e.target.value); setHasChanges(true); }}
                placeholder="titulo-da-noticia"
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Categoria *</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setCategory(opt.value); setHasChanges(true); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      category === opt.value
                        ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30"
                        : "bg-background-void text-gray-400 border-brand-orange-muted/20 hover:border-brand-orange/30"
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Resumo / Subtítulo *</span>
                <span className={`text-[9px] ${summary.length > 260 ? "text-red-400" : "text-gray-500"}`}>{summary.length}/280</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setHasChanges(true); }}
                maxLength={280}
                rows={3}
                placeholder="Resumo breve para o feed (máx. 280 caracteres)..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-4 py-3 outline-none focus:border-brand-orange/50 transition-colors font-sans text-sm leading-relaxed"
              />
            </div>

            {/* Imagem de Capa */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Imagem de Capa (URL)</label>
              <input
                type="url" value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setHasChanges(true); }}
                placeholder="https://..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Alt da Imagem de Capa</label>
              <input
                type="text" value={imageAlt}
                onChange={(e) => { setImageAlt(e.target.value); setHasChanges(true); }}
                placeholder="Descrição da imagem..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>

            {/* Preview da Capa */}
            {imageUrl && (
              <div className="lg:col-span-2">
                <div className="relative aspect-video max-h-48 w-full max-w-md overflow-hidden rounded-lg border border-brand-orange-muted/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt={imageAlt || "Preview"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              </div>
            )}

            {/* Autor */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Autor</label>
              <input
                type="text" value={authorName}
                onChange={(e) => { setAuthorName(e.target.value); setHasChanges(true); }}
                placeholder="Seu nome..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Tag do Autor</label>
              <input
                type="text" value={authorTag}
                onChange={(e) => { setAuthorTag(e.target.value); setHasChanges(true); }}
                placeholder="🛠️ Hard News"
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ====== BODY EDITOR ====== */}
        <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl overflow-hidden mb-8">
          <div className="border-b border-brand-orange-muted/10 bg-card-slate/30 px-6 py-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Corpo da Matéria
            </h2>
            <span className="text-[9px] text-gray-500">{blocks.length} bloco{blocks.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="p-6">
            {blocks.length === 0 ? (
              <div className="text-center py-16 text-gray-500 font-sans border border-dashed border-brand-orange-muted/10 rounded-xl">
                <p className="mb-4">Nenhum bloco ainda.</p>
                <p className="text-[10px] text-gray-600">Adicione texto ou imagem pelos botões abaixo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="relative bg-background-void border border-brand-orange-muted/10 rounded-xl group hover:border-brand-orange-muted/30 transition-colors"
                  >
                    {/* Block header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-brand-orange-muted/5">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-orange/70"><BlockIcon type={block.type} /></span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                          Bloco {index + 1} — {block.type === "text" ? "Texto" : "Imagem"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveBlock(index, "up")}
                          disabled={index === 0}
                          className="p-1.5 rounded bg-card-slate hover:bg-brand-orange/10 hover:text-brand-orange text-gray-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="Mover para cima"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                          onClick={() => moveBlock(index, "down")}
                          disabled={index === blocks.length - 1}
                          className="p-1.5 rounded bg-card-slate hover:bg-brand-orange/10 hover:text-brand-orange text-gray-400 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="Mover para baixo"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1.5 rounded bg-card-slate hover:bg-red-500/10 hover:text-red-400 text-gray-400 cursor-pointer transition-colors"
                          title="Excluir Bloco"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Block body */}
                    <div className="p-5">
                      {block.type === "text" ? (
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlockValue(block.id, "content", e.target.value)}
                          rows={6}
                          placeholder="Escreva o conteúdo em Markdown..."
                          className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg p-4 outline-none focus:border-brand-orange/30 transition-colors font-sans text-sm leading-relaxed"
                        />
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">URL da Imagem *</label>
                              <input
                                type="url" value={block.url}
                                onChange={(e) => updateBlockValue(block.id, "url", e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/30 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Texto Alternativo (Alt) *</label>
                              <input
                                type="text" value={block.alt}
                                onChange={(e) => updateBlockValue(block.id, "alt", e.target.value)}
                                placeholder="Descrição da imagem..."
                                className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/30 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Legenda (opcional)</label>
                            <input
                              type="text" value={block.caption || ""}
                              onChange={(e) => updateBlockValue(block.id, "caption", e.target.value)}
                              placeholder="Legenda que aparece abaixo da imagem..."
                              className="w-full bg-card-slate/30 border border-brand-orange-muted/10 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/30 transition-colors"
                            />
                          </div>
                          {block.url && (
                            <div className="relative aspect-video max-h-60 w-full overflow-hidden rounded-lg border border-brand-orange-muted/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={block.url} alt={block.alt || "Preview"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add block buttons */}
            <div className="flex items-center gap-3 border-t border-brand-orange-muted/10 pt-6 mt-6">
              <button
                onClick={addTextBlock}
                className="flex-1 bg-card-slate/60 hover:bg-brand-orange/10 hover:text-brand-orange text-gray-300 border border-brand-orange-muted/15 hover:border-brand-orange/30 py-3 rounded-lg font-bold transition-all cursor-pointer text-xs text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Texto (Markdown)
              </button>
              <button
                onClick={addImageBlock}
                className="flex-1 bg-card-slate/60 hover:bg-brand-orange/10 hover:text-brand-orange text-gray-300 border border-brand-orange-muted/15 hover:border-brand-orange/30 py-3 rounded-lg font-bold transition-all cursor-pointer text-xs text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Imagem
              </button>
            </div>
          </div>
        </div>

        {/* ====== ACTION BAR ====== */}
        <div className="bg-card-slate/40 border border-brand-orange-muted/10 rounded-xl overflow-hidden">
          <div className="border-b border-brand-orange-muted/10 bg-card-slate/30 px-6 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ações
            </h2>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer disabled:opacity-50 text-sm text-center"
            >
              {isSaving ? "Salvando..." : "Publicar Notícia"}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex-1 bg-card-slate/60 hover:bg-card-slate text-gray-300 font-bold py-3 rounded-lg border border-brand-orange-muted/10 hover:border-brand-orange/20 transition-all cursor-pointer disabled:opacity-50 text-sm text-center"
            >
              {isSaving ? "Salvando..." : "Salvar como Rascunho"}
            </button>
            {postId && (
              <button
                onClick={handleDuplicate}
                disabled={isSaving}
                className="px-6 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 font-bold py-3 rounded-lg border border-purple-600/20 hover:border-purple-600/40 transition-all cursor-pointer disabled:opacity-50 text-sm text-center"
              >
                📋 Duplicar
              </button>
            )}
          </div>
        </div>
      </main>

      {/* ====== PREVIEW MODAL ====== */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-background-void/95 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-background-void/90 backdrop-blur-md py-3 z-10 border-b border-brand-orange-muted/10">
              <h2 className="text-sm font-mono font-bold text-brand-orange uppercase tracking-wider flex items-center gap-2">
                👁️ Preview
                {postId && <span className="text-[9px] text-gray-500 font-normal">(ID: {postId.slice(0, 8)}…)</span>}
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-xs text-gray-400 hover:text-white border border-gray-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <article className="space-y-6">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border rounded-md ${(CATEGORY_CONFIG[category] || CATEGORY_CONFIG.breaking).color}`}>
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
                <span>Por <span className="text-white font-bold">{authorName || "Redação"}</span></span>
                {authorTag && <><span>•</span><span className="text-brand-orange-muted font-bold">{authorTag}</span></>}
              </div>

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
                            {block.caption && <span className="text-xs text-gray-500 font-mono text-center">{block.caption}</span>}
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
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-gray-400">Carregando editor...</span>
        </div>
      </div>
    }>
      <EditForm />
    </Suspense>
  );
}
