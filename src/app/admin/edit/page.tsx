"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { parseMarkdownToReact } from "@/lib/markdown";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { AUTHOR_TAGS, normalizeAuthorTag, validateEditorialContent, type EditorialBlock } from "@/lib/content-validation";
import { isAdminUser } from "@/lib/auth";
import type { EditorialImage, Post, PostCategory } from "@/lib/types/database";
import { CATEGORY_CONFIG } from "@/lib/types/database";

type ContentBlock = EditorialBlock;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function imageLoads(url: string) {
  return new Promise<boolean>((resolve) => {
    const image = document.createElement("img");
    const timeout = window.setTimeout(() => resolve(false), 12_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    image.src = url;
  });
}

const CATEGORY_OPTIONS: { value: PostCategory; label: string }[] = [
  { value: "breaking", label: "Breaking" },
  { value: "review", label: "Review" },
  { value: "hardware", label: "Hardware" },
  { value: "opinion", label: "Opinião" },
  { value: "industry", label: "Indústria" },
  { value: "modding", label: "Modding" },
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
  const supabase = useMemo(() => createDataClient(), []);
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
  const [authorTag, setAuthorTag] = useState(AUTHOR_TAGS.breaking);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [aiPromptBlock, setAiPromptBlock] = useState<string | null>(null);
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [coverAiPrompt, setCoverAiPrompt] = useState<string | null>(null);
  const [coverAiLoading, setCoverAiLoading] = useState(false);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [isProcessingCover, setIsProcessingCover] = useState(false);
  const [bodyImageIds, setBodyImageIds] = useState<Record<string, string>>({});
  const [processingBodyImageId, setProcessingBodyImageId] = useState<string | null>(null);

  const editorialChecklist = useMemo(() => {
    const textContent = blocks
      .filter((block): block is Extract<ContentBlock, { type: "text" }> => block.type === "text")
      .map((block) => block.content)
      .join("\n");
    const imageBlocks = blocks.filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image");
    const imageUrls = [imageUrl, ...imageBlocks.map((block) => block.url)].filter(Boolean);

    return [
      { label: "Título e slug definidos", complete: Boolean(title.trim() && slug.trim()) },
      { label: "Resumo editorial preenchido", complete: summary.trim().length >= 20 },
      { label: "Capa com texto alternativo", complete: Boolean(imageUrl.trim() && imageAlt.trim().length >= 3) },
      { label: "Corpo com texto", complete: textContent.trim().length > 0 },
      { label: "Imagens sem repetição", complete: new Set(imageUrls).size === imageUrls.length },
      { label: "Fonte citada no final", complete: /\*\*Fonte:\*\*/i.test(textContent) },
    ];
  }, [blocks, imageAlt, imageUrl, slug, summary, title]);

  const completedChecklistItems = editorialChecklist.filter((item) => item.complete).length;
  const publishingIssues = useMemo(
    () => validateEditorialContent({ slug, title, summary, imageUrl, imageAlt, blocks }),
    [blocks, imageAlt, imageUrl, slug, summary, title],
  );
  const previewDialogRef = useModalDialog<HTMLDivElement>(showPreview, () => setShowPreview(false));

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

        if (!postId) {
          setAuthorName("The Brick");
          setAuthorTag(AUTHOR_TAGS.breaking);
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

    init();
  }, [router, postId, supabase]);

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

  const generateImage = async (blockId: string) => {
    const prompt = aiPrompts[blockId];
    if (!prompt || prompt.trim().length === 0) {
      setAiError("Digite um prompt para gerar a imagem.");
      return;
    }
    setAiLoading(blockId);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const data = await invokeFunction<{ url: string }>("generate-image", { description: prompt }, { accessToken: session.access_token });
      updateBlockValue(blockId, "url", data.url);
      setAiPromptBlock(null);
    } catch (err: unknown) {
      setAiError(errorMessage(err, "Erro ao gerar imagem"));
    } finally {
      setAiLoading(null);
    }
  };

  const generateCoverImage = async () => {
    if (!coverAiPrompt || coverAiPrompt.trim().length === 0) return;
    setCoverAiLoading(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const data = await invokeFunction<{ url: string }>("generate-image", { description: coverAiPrompt }, { accessToken: session.access_token });
      setImageUrl(data.url);
      setHasChanges(true);
      setCoverAiPrompt(null);
    } catch (err: unknown) {
      setAiError(errorMessage(err, "Erro ao gerar imagem"));
    } finally {
      setCoverAiLoading(false);
    }
  };

  const processCoverImage = async () => {
    if (!imageUrl.trim()) {
      setError("Informe a URL da imagem de capa.");
      return;
    }

    setIsProcessingCover(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const response = await fetch("/api/admin/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sourceUrl: imageUrl,
          postId,
          altText: imageAlt,
          kind: "cover",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao processar a imagem");
      const processedImage = payload.image as EditorialImage;
      setImageUrl(processedImage.public_url);
      setCoverImageId(processedImage.id);
      setHasChanges(true);
    } catch (err: unknown) {
      setError(errorMessage(err, "Falha ao processar a imagem"));
    } finally {
      setIsProcessingCover(false);
    }
  };

  const processBodyImage = async (block: Extract<ContentBlock, { type: "image" }>) => {
    if (!block.url.trim()) {
      setError("Informe a URL da imagem do bloco.");
      return;
    }

    setProcessingBodyImageId(block.id);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const response = await fetch("/api/admin/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sourceUrl: block.url,
          postId,
          altText: block.alt,
          kind: "body",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao processar a imagem");
      const processedImage = payload.image as EditorialImage;
      updateBlockValue(block.id, "url", processedImage.public_url);
      setBodyImageIds((current) => ({ ...current, [block.id]: processedImage.id }));
    } catch (err: unknown) {
      setError(errorMessage(err, "Falha ao processar a imagem"));
    } finally {
      setProcessingBodyImageId(null);
    }
  };

  const toggleAiPrompt = (blockId: string, altText: string) => {
    setAiPromptBlock((prev) => prev === blockId ? null : blockId);
    if (aiPromptBlock !== blockId) {
      setAiPrompts((prev) => ({
        ...prev,
        [blockId]: prev[blockId] || `Imagem fotorrealista de ${altText || "cena relacionada a videogames"}. Estilo fotografia editorial, iluminação dramática, alta qualidade, resolução 4K. Sem texto na imagem, sem marcas d'água.`,
      }));
      setAiError(null);
    }
  };

  const handleDuplicate = async () => {
    if (!title || !slug || !summary) return;
    setIsSaving(true);
    setError(null);
    try {
      const dupSlug = slug + "-copy-" + Date.now().toString(36);
      const dupTitle = title + " (cópia)";
      const { data, error: insertError } = await supabase
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
      const duplicatedPost = data as unknown as Post;
      router.push(`/admin/edit?id=${duplicatedPost.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro ao duplicar matéria"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (isPublished: boolean, updatePublishDate: boolean = false) => {
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
    if (isPublished) {
      const editorialErrors = validateEditorialContent({ slug, title, summary, imageUrl, imageAlt, blocks });
      if (editorialErrors.length > 0) {
        setError(editorialErrors.join(" "));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setIsSaving(true);
      const imageUrls = [imageUrl, ...blocks.filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image").map((block) => block.url)];
      const results = await Promise.all(imageUrls.map(imageLoads));
      const failedIndex = results.findIndex((loaded) => !loaded);
      if (failedIndex >= 0) {
        setError(`A imagem não carregou e não pode ser publicada: ${imageUrls[failedIndex]}`);
        setIsSaving(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setIsSaving(true);
    setError(null);
    try {
      const newPublishedAt = isPublished
        ? (updatePublishDate || !publishedAt ? new Date().toISOString() : publishedAt)
        : null;

      const payload = {
        slug, title, summary, body: JSON.stringify(blocks), category,
        image_url: imageUrl || null, image_alt: imageAlt || null,
        author_name: authorName || "Redação", author_tag: authorTag || null,
        is_published: isPublished,
        published_at: newPublishedAt,
      };
      let savedPost: Post | null = null;
      if (postId) {
        const { data, error: updateError } = await supabase
          .from("posts").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", postId).select().single();
        if (updateError) throw updateError;
        savedPost = data as unknown as Post;
      } else {
        const { data, error: insertError } = await supabase
          .from("posts").insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
        if (insertError) throw insertError;
        savedPost = data as unknown as Post;
      }
      const imageIdsToLink = [
        ...(coverImageId ? [coverImageId] : []),
        ...Object.values(bodyImageIds),
      ];
      if (savedPost && imageIdsToLink.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada");
        const response = await fetch("/api/admin/images", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ imageIds: imageIdsToLink, postId: savedPost.id }),
        });
        if (!response.ok) throw new Error("A matéria foi salva, mas a imagem não pôde ser vinculada");
      }
      if (isPublished && updatePublishDate && savedPost) {
        const np = { title: savedPost.title, slug: savedPost.slug, category: savedPost.category };
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
          await invokeFunction("send-push-notification", {
            title: `🧱 ${np.title}`,
            body: `Nova matéria em ${np.category}`,
            url: `${siteUrl}/posts/${np.slug}`,
          }, { accessToken: session.access_token });
        }
      }
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro ao salvar"));
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
    <AdminShell
      active="editor"
      title={postId ? "Editar matéria" : "Nova matéria"}
      description={postId
        ? "Revise o conteúdo, corrija pendências e escolha como esta versão deve voltar ao ar."
        : "Construa a matéria em blocos, valide a apresentação e salve primeiro como rascunho."}
      status={hasChanges ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Alterações não salvas
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-gray-400">
          Sem alterações pendentes
        </span>
      )}
      actions={
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-bold text-gray-100 transition-colors hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-brand-orange"
        >
          Pré-visualizar
        </button>
      }
      wide
    >
        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}
        {aiError && (
          <div role="alert" className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
            {aiError}
          </div>
        )}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
        <div className="overflow-hidden rounded-2xl bg-[#15161d]">
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

          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-5">
            <div className="lg:col-span-2">
              <label className="block text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1 sm:mb-1.5 flex items-center justify-between">
                <span>Título da Notícia *</span>
                <span className={`text-[9px] ${title.length > 110 ? "text-red-400" : "text-gray-500"}`}>{title.length}/120</span>
              </label>
              <input
                type="text" value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Título atraente (máx. 120 caracteres)..."
                maxLength={120}
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 outline-none focus:border-brand-orange/50 transition-colors text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">URL Amigável (Slug) *</label>
              <input
                type="text" value={slug}
                onChange={(e) => { setSlug(e.target.value); setHasChanges(true); }}
                placeholder="titulo-da-noticia"
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1 sm:mb-1.5">Categoria *</label>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setCategory(opt.value); setAuthorTag(AUTHOR_TAGS[opt.value]); setHasChanges(true); }}
                    className={`min-h-11 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition-all cursor-pointer uppercase tracking-wider ${
                      category === opt.value
                        ? "bg-brand-orange/15 text-brand-orange border-brand-orange/40 shadow-sm"
                        : "bg-background-void text-gray-400 border-brand-orange-muted/20 hover:border-brand-orange/30 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Resumo / Subtítulo *</span>
                <span className={`text-[9px] ${summary.length > 280 ? "text-red-400" : "text-gray-500"}`}>{summary.length}/300</span>
              </label>
              <textarea
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setHasChanges(true); }}
                maxLength={300}
                rows={3}
                placeholder="Uma frase ou dois parágrafos explicando os fatos principais e por que a notícia importa (máx. 300 caracteres)..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-4 py-3 outline-none focus:border-brand-orange/50 transition-colors font-sans text-sm leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Imagem de Capa (URL)</label>
              <input
                type="url" value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setHasChanges(true); }}
                placeholder="https://..."
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors text-xs font-mono"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={processCoverImage}
                  disabled={isProcessingCover || !imageUrl.trim()}
                  className="min-h-11 rounded-xl bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isProcessingCover ? "Baixando e convertendo…" : "Baixar e padronizar"}
                </button>
                <Link
                  href="/admin/images"
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Abrir biblioteca
                </Link>
              </div>
              {coverImageId && (
                <p className="mt-2 text-[11px] text-emerald-300">
                  Imagem armazenada em WebP, 1280 × 720.
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Alt da Imagem de Capa</label>
              <div className="flex gap-2">
                <input
                  type="text" value={imageAlt}
                  onChange={(e) => { setImageAlt(e.target.value); setHasChanges(true); }}
                  placeholder="Descrição da imagem..."
                  className="flex-1 bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    const alt = imageAlt || "cena relacionada a videogames";
                    setCoverAiPrompt(alt);
                  }}
                  className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-accent-blue/30 px-2.5 py-2 text-[10px] text-accent-blue transition-all hover:bg-accent-blue/10 hover:text-white"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  IA
                </button>
              </div>
            </div>
            {coverAiPrompt && (
              <div className="lg:col-span-2 bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4 space-y-3">
                <label className="block text-[9px] uppercase font-bold text-accent-blue mb-1">
                  🤖 Descrição para gerar a imagem de capa
                </label>
                <textarea
                  value={coverAiPrompt}
                  onChange={(e) => setCoverAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Descreva a imagem de capa que deseja gerar..."
                  className="w-full bg-background-void border border-accent-blue/20 text-white rounded-lg p-3 outline-none focus:border-accent-blue/50 transition-colors font-sans text-xs leading-relaxed"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateCoverImage}
                    disabled={coverAiLoading || !coverAiPrompt?.trim()}
                    className="flex min-h-11 items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-xs font-bold text-white transition-all hover:bg-accent-blue/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {coverAiLoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      "🎨 Gerar Imagem de Capa"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverAiPrompt(null)}
                    className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-gray-400 transition-colors hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {imageUrl && (
              <div className="lg:col-span-2">
                <div className="relative aspect-video max-h-48 w-full max-w-md overflow-hidden rounded-lg border border-brand-orange-muted/20 bg-background-void/90 flex items-center justify-center p-1">
                  <img src={imageUrl} alt={imageAlt || "Preview"} className="w-full h-full object-contain rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              </div>
            )}
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
                placeholder="Hard News"
                className="w-full bg-background-void border border-brand-orange-muted/20 text-white rounded-lg px-3 py-2 outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-[#15161d]">
          <div className="border-b border-brand-orange-muted/10 bg-card-slate/30 px-6 py-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Corpo da Matéria
            </h2>
            <span className="text-[9px] text-gray-500">{blocks.length} bloco{blocks.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="p-4 sm:p-6">
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
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-card-slate text-gray-400 transition-colors hover:bg-brand-orange/10 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-20"
                          title="Mover para cima"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                          onClick={() => moveBlock(index, "down")}
                          disabled={index === blocks.length - 1}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-card-slate text-gray-400 transition-colors hover:bg-brand-orange/10 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-20"
                          title="Mover para baixo"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-card-slate text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-200"
                          title="Excluir Bloco"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
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
                          <div className="flex flex-wrap gap-2 border-t border-brand-orange-muted/5 pt-3">
                            <button
                              type="button"
                              onClick={() => processBodyImage(block)}
                              disabled={processingBodyImageId === block.id || !block.url.trim()}
                              className="min-h-11 rounded-xl bg-brand-orange px-3 text-[10px] font-bold text-white transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {processingBodyImageId === block.id ? "Convertendo…" : "Baixar e padronizar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAiPrompt(block.id, block.alt)}
                              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-accent-blue/30 px-3 py-1.5 text-[10px] text-accent-blue transition-all hover:bg-accent-blue/10 hover:text-white"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                              </svg>
                              Gerar com IA
                            </button>
                            {bodyImageIds[block.id] && (
                              <span className="inline-flex min-h-11 items-center text-[10px] font-semibold text-emerald-300">
                                WebP 1280 × 720
                              </span>
                            )}
                          </div>
                          {aiPromptBlock === block.id && (
                            <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4 space-y-3">
                              <label className="block text-[9px] uppercase font-bold text-accent-blue mb-1">
                                🤖 Descrição para gerar a imagem
                              </label>
                              <textarea
                                value={aiPrompts[block.id] || ""}
                                onChange={(e) => setAiPrompts((prev) => ({ ...prev, [block.id]: e.target.value }))}
                                rows={4}
                                placeholder="Descreva a imagem que deseja gerar..."
                                className="w-full bg-background-void border border-accent-blue/20 text-white rounded-lg p-3 outline-none focus:border-accent-blue/50 transition-colors font-sans text-xs leading-relaxed"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => generateImage(block.id)}
                                  disabled={aiLoading === block.id || !aiPrompts[block.id]?.trim()}
                                  className="flex min-h-11 items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-xs font-bold text-white transition-all hover:bg-accent-blue/80 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {aiLoading === block.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Gerando...
                                    </>
                                  ) : (
                                    "🎨 Gerar Imagem"
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAiPromptBlock(null)}
                                  className="min-h-11 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-gray-400 transition-colors hover:text-white"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                          {block.url && (
                            <div className="relative aspect-video max-h-60 w-full overflow-hidden rounded-lg border border-brand-orange-muted/10">
                              <Image unoptimized fill sizes="(max-width: 768px) 100vw, 800px" src={block.url} alt={block.alt || "Preview"} className="object-contain" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          </div>

          <aside className="space-y-6 xl:sticky xl:top-28">
            <section aria-labelledby="editor-checklist-title" className="rounded-2xl bg-[#15161d] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 id="editor-checklist-title" className="font-heading text-lg font-extrabold text-white">Checklist editorial</h2>
                <span className="text-xs font-bold text-brand-orange">
                  {completedChecklistItems}/{editorialChecklist.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {editorialChecklist.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    {item.complete ? (
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-black text-emerald-300">
                        ✓
                      </span>
                    ) : (
                      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[11px] font-black text-gray-600">
                        ·
                      </span>
                    )}
                    <span className={`text-xs leading-5 ${item.complete ? "text-gray-300" : "text-gray-500"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-5 rounded-xl p-3 text-xs leading-5 ${
                publishingIssues.length === 0
                  ? "bg-emerald-500/10 text-emerald-200"
                  : "bg-amber-500/10 text-amber-200"
              }`}>
                {publishingIssues.length === 0
                  ? "A validação técnica não encontrou bloqueios para publicação."
                  : `${publishingIssues.length} bloqueio${publishingIssues.length === 1 ? "" : "s"} técnico${publishingIssues.length === 1 ? "" : "s"} ainda precisa${publishingIssues.length === 1 ? "" : "m"} de correção.`}
              </div>
            </section>

        <div className="overflow-hidden rounded-2xl bg-[#15161d]">
          <div className="border-b border-brand-orange-muted/10 bg-card-slate/30 px-6 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-orange flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Publicação
            </h2>
          </div>
          <div className="flex flex-col gap-2 p-4 sm:p-5">
            {publishedAt ? (
              <>
                <button
                  onClick={() => handleSave(true, false)}
                  disabled={isSaving}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] px-4 text-sm font-bold text-white transition-colors hover:bg-white/[0.11] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar sem republicar"}
                </button>
                <button
                  onClick={() => handleSave(true, true)}
                  disabled={isSaving}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-[#ff7122] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Republicando..." : "Republicar com nova data"}
                </button>
                <button
                  onClick={() => handleSave(false, false)}
                  disabled={isSaving}
                  className="min-h-11 w-full rounded-xl px-4 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-500/10 disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Retirar do ar e salvar"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSave(true, true)}
                  disabled={isSaving}
                  className="min-h-11 w-full rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-[#ff7122] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Publicando..." : "Publicar matéria"}
                </button>
                <button
                  onClick={() => handleSave(false, false)}
                  disabled={isSaving}
                  className="min-h-11 w-full rounded-xl bg-white/[0.07] px-4 text-sm font-bold text-gray-200 transition-colors hover:bg-white/[0.11] disabled:cursor-wait disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : "Salvar como rascunho"}
                </button>
              </>
            )}

            {postId && (
              <button
                onClick={handleDuplicate}
                disabled={isSaving}
                className="min-h-11 w-full rounded-xl px-4 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/10 disabled:cursor-wait disabled:opacity-50"
              >
                Duplicar como rascunho
              </button>
            )}
          </div>
        </div>
          </aside>
        </div>
      {showPreview && (
        <div
          ref={previewDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 overflow-y-auto bg-background-void/95 backdrop-blur-sm"
        >
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6 sticky top-0 bg-background-void/90 backdrop-blur-md py-2 sm:py-3 z-10 border-b border-brand-orange-muted/10">
              <h2 id="preview-title" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-orange sm:text-sm">
                Pré-visualização
                {postId && <span className="text-[8px] sm:text-[9px] text-gray-500 font-normal">(ID: {postId.slice(0, 8)}…)</span>}
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="min-h-11 rounded-xl px-3 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Fechar
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
                          return <div key={i}>{parseMarkdownToReact(line)}</div>;
                        })}
                      </div>
                    );
                  }
                  if (block.type === "image") {
                    return (
                      <div key={block.id} className="my-8 flex flex-col gap-2">
                        {block.url ? (
                          <>
                            <div className="relative w-full overflow-hidden rounded-xl border border-brand-orange-muted/20 shadow-lg bg-[#08090C] flex items-center justify-center p-1">
                              <img src={block.url} alt={block.alt || "Imagem da matéria"} className="w-full h-auto max-h-[600px] object-contain rounded-lg" />
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
    </AdminShell>
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
