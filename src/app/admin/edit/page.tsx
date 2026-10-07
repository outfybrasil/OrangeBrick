"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { PublishConfirmModal } from "@/components/admin/PublishConfirmModal";
import { EditorialQualityChecklist } from "@/components/admin/EditorialQualityChecklist";
import { useModalDialog } from "@/lib/hooks/useModalDialog";
import { createDataClient } from "@/lib/supabase/client";
import { parseMarkdownToReact } from "@/lib/markdown";
import { AUTHOR_TAGS, normalizeAuthorTag, parseEditorialBlocks, parseEditorialSources, validateEditorialContent, validateEditorialQuality, type EditorialBlock } from "@/lib/content-validation";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { isAdminUser } from "@/lib/auth";
import type { Post, PostCategory, Topic } from "@/lib/types/database";

type ContentBlock = EditorialBlock;
type InformationStatus = Post["information_status"];

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string" && errObj.message.trim()) {
      const msg = errObj.message;
      if (msg.includes("duplicate key value violates unique constraint")) {
        return "Já existe uma matéria cadastrada com este slug. Altere o slug nas configurações de SEO.";
      }
      if (msg.includes("violates row-level security policy")) {
        return "Sua conta não tem permissão para salvar matérias ou sua sessão expirou.";
      }
      return msg;
    }
  }
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

const AUTHOR_OPTIONS = ["Gustavo", "Marina", "Caio", "Redação"];

type ArticleDraftFields = {
  slug: string;
  title: string;
  summary: string;
  category: PostCategory;
  topicId: string;
  imageUrl: string;
  imageAlt: string;
  authorName: string;
  authorTag: string;
  informationStatus: InformationStatus;
  quoteText: string;
  quoteAuthor: string;
  quoteRole: string;
  quoteSourceUrl: string;
  quoteSourceVerified: boolean;
  sourcesText: string;
  shortArticleReason: string;
  absenceRegistered: boolean;
  correctionNote: string;
  scheduledAt: string | null;
  blocks: ContentBlock[];
};

type ArticleDraftPayload = ArticleDraftFields & { savedAt?: string };

function readLocalDraft(key: string): ArticleDraftPayload | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArticleDraftPayload;
    if (!parsed || typeof parsed !== "object" || typeof parsed.title !== "string" || !Array.isArray(parsed.blocks)) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function serializeDraftState(fields: ArticleDraftFields) {
  return JSON.stringify({
    slug: fields.slug,
    title: fields.title,
    summary: fields.summary,
    category: fields.category,
    topicId: fields.topicId,
    imageUrl: fields.imageUrl,
    imageAlt: fields.imageAlt,
    authorName: fields.authorName,
    authorTag: fields.authorTag,
    informationStatus: fields.informationStatus,
    quoteText: fields.quoteText,
    quoteAuthor: fields.quoteAuthor,
    quoteRole: fields.quoteRole,
    quoteSourceUrl: fields.quoteSourceUrl,
    quoteSourceVerified: fields.quoteSourceVerified,
    sourcesText: fields.sourcesText,
    shortArticleReason: fields.shortArticleReason,
    absenceRegistered: fields.absenceRegistered,
    correctionNote: fields.correctionNote,
    scheduledAt: fields.scheduledAt,
    blocks: fields.blocks,
  });
}

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
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [informationStatus, setInformationStatus] = useState<InformationStatus>("confirmed");
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [quoteRole, setQuoteRole] = useState("");
  const [quoteSourceUrl, setQuoteSourceUrl] = useState("");
  const [quoteSourceVerified, setQuoteSourceVerified] = useState(false);
  const [absenceRegistered, setAbsenceRegistered] = useState(false);
  const [sourcesText, setSourcesText] = useState("");
  const [shortArticleReason, setShortArticleReason] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [localDraft, setLocalDraft] = useState<{ savedLabel: string; data: ArticleDraftPayload } | null>(null);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const previewRef = useModalDialog<HTMLDivElement>(showPreview, () => setShowPreview(false));

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

  const editorialChecklist = useMemo(() => validateEditorialQuality({
    title,
    summary,
    imageUrl,
    imageAlt,
    body: blocks,
    sourcesText,
    quoteText,
    quoteAuthor,
    quoteRole,
    quoteSourceUrl,
    quoteSourceVerified,
    absenceRegistered,
    informationStatus,
    correctionNote,
    shortArticleReason,
  }), [absenceRegistered, blocks, correctionNote, imageAlt, imageUrl, informationStatus, quoteAuthor, quoteRole, quoteSourceUrl, quoteSourceVerified, quoteText, shortArticleReason, sourcesText, summary, title]);

  useEffect(() => {
    if (isLoading || !hasChanges) return;
    const storageKey = `orange-brick:article-draft:${postId || "new"}`;
    const timer = window.setInterval(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(storageKey, JSON.stringify({ slug, title, summary, category, topicId, imageUrl, imageAlt, authorName, authorTag, informationStatus, quoteText, quoteAuthor, quoteRole, quoteSourceUrl, quoteSourceVerified, sourcesText, shortArticleReason, correctionNote, scheduledAt, absenceRegistered, blocks, savedAt }));
      setAutoSavedAt(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(savedAt)));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [absenceRegistered, authorName, authorTag, blocks, category, correctionNote, hasChanges, imageAlt, imageUrl, informationStatus, isLoading, postId, quoteAuthor, quoteRole, quoteSourceUrl, quoteSourceVerified, quoteText, scheduledAt, shortArticleReason, slug, sourcesText, summary, title, topicId]);

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
    let isActive = true;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!isActive) return;

        if (!user || !isAdminUser(user)) {
          router.push("/admin/login");
          return;
        }

        const { data: topicData } = await supabase
          .from("topics")
          .select("*")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (!isActive) return;
        setTopics((topicData || []) as Topic[]);

        if (!postId) {
          const { data: preferences } = await supabase
            .from("admin_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          if (!isActive) return;
          const storedPreferences = preferences as { default_author?: string; default_category?: PostCategory } | null;
          const nextCategory = storedPreferences?.default_category && CATEGORY_OPTIONS.some((option) => option.value === storedPreferences.default_category)
            ? storedPreferences.default_category
            : "breaking";
          setAuthorName(storedPreferences?.default_author?.trim() || "Redação");
          setCategory(nextCategory);
          setAuthorTag(AUTHOR_TAGS[nextCategory]);

          const loadedState: ArticleDraftFields = {
            slug: "",
            title: "",
            summary: "",
            category: nextCategory,
            topicId: "",
            imageUrl: "",
            imageAlt: "",
            authorName: storedPreferences?.default_author?.trim() || "Redação",
            authorTag: AUTHOR_TAGS[nextCategory],
            informationStatus: "confirmed",
            quoteText: "",
            quoteAuthor: "",
            quoteRole: "",
            quoteSourceUrl: "",
            quoteSourceVerified: false,
            sourcesText: "",
            shortArticleReason: "",
            absenceRegistered: false,
            correctionNote: "",
            scheduledAt: null,
            blocks: [],
          };
          const storedDraft = readLocalDraft(`orange-brick:article-draft:new`);
          if (storedDraft && serializeDraftState(storedDraft) !== serializeDraftState(loadedState)) {
            setLocalDraft({
              savedLabel: storedDraft.savedAt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(storedDraft.savedAt)) : "horário desconhecido",
              data: storedDraft,
            });
          }
          setIsLoading(false);
          return;
        }

        if (postId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!isActive) return;
          if (!session) throw new Error("Sess\u00e3o expirada");
          const postResponse = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          if (!isActive) return;
          if (!postResponse.ok) throw new Error("N\u00e3o foi poss\u00edvel carregar a mat\u00e9ria.");
          const postResult = await postResponse.json() as { post?: Post };
          if (!isActive) return;
          if (!postResult.post) throw new Error("Mat\u00e9ria n\u00e3o encontrada.");

          const typedPost = postResult.post;
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
          setScheduledAt(typedPost.scheduled_at || null);
          setInformationStatus(typedPost.information_status || "confirmed");
          const storedQuote = typedPost.featured_quote as { text?: string; author?: string; role?: string; source_url?: string; source_verified?: boolean; absence_registered?: boolean } | null;
          setQuoteText(storedQuote?.text || "");
          setQuoteAuthor(storedQuote?.author || "");
          setQuoteRole(storedQuote?.role || "");
          setQuoteSourceUrl(storedQuote?.source_url || "");
          setQuoteSourceVerified(storedQuote?.source_verified === true);
          setAbsenceRegistered(Boolean(storedQuote?.absence_registered));
          const storedSources = Array.isArray(typedPost.editorial_sources) ? typedPost.editorial_sources as Array<{ name?: string; url?: string; is_official?: boolean; source_verified?: boolean }> : [];
          setSourcesText(storedSources.map((source) => `${source.name || "Fonte"}|${source.url || ""}${source.is_official ? "|oficial" : ""}${source.source_verified ? "|verificada" : ""}`).join("\n"));
          setCorrectionNote(typedPost.correction_note || "");

          const parsedBlocks = parseEditorialBlocks(typedPost.body);
          setBlocks(parsedBlocks);

          const loadedState: ArticleDraftFields = {
            slug: typedPost.slug,
            title: typedPost.title,
            summary: typedPost.summary ?? "",
            category: typedPost.category,
            topicId: typedPost.topic_id || "",
            imageUrl: typedPost.image_url || "",
            imageAlt: typedPost.image_alt || "",
            authorName: typedPost.author_name,
            authorTag: normalizeAuthorTag(typedPost.author_tag),
            informationStatus: typedPost.information_status || "confirmed",
            quoteText: storedQuote?.text || "",
            quoteAuthor: storedQuote?.author || "",
            quoteRole: storedQuote?.role || "",
            quoteSourceUrl: storedQuote?.source_url || "",
            quoteSourceVerified: storedQuote?.source_verified === true,
            sourcesText: storedSources.map((source) => `${source.name || "Fonte"}|${source.url || ""}${source.is_official ? "|oficial" : ""}${source.source_verified ? "|verificada" : ""}`).join("\n"),
            shortArticleReason: typedPost.short_article_reason || "",
            absenceRegistered: Boolean(storedQuote?.absence_registered),
            correctionNote: typedPost.correction_note || "",
            scheduledAt: typedPost.scheduled_at || null,
            blocks: parsedBlocks,
          };
          const storedDraft = readLocalDraft(`orange-brick:article-draft:${postId}`);
          if (storedDraft && serializeDraftState(storedDraft) !== serializeDraftState(loadedState)) {
            setLocalDraft({
              savedLabel: storedDraft.savedAt ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(storedDraft.savedAt)) : "horário desconhecido",
              data: storedDraft,
            });
          }
        }
      } catch (err: unknown) {
        if (!isActive) return;
        setError(errorMessage(err, "Erro de inicialização"));
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void init();
    return () => {
      isActive = false;
    };
  }, [postId, router, supabase]);

  const addBlock = (type: "text" | "image" | "heading" | "quote" | "video") => {
    const id = `block-${Date.now()}`;
    let newBlock: ContentBlock;

    if (type === "image") {
      newBlock = { id, type: "image", url: "", alt: "", caption: "" };
    } else if (type === "heading") {
      newBlock = { id, type: "text", content: "## Novo Subtítulo\n\n" };
    } else if (type === "quote") {
      newBlock = { id, type: "text", content: "> \"Insira sua citação aqui.\"\n\n" };
    } else if (type === "video") {
      newBlock = { id, type: "video", url: "", title: "", channelName: "", officialChannelConfirmed: false };
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

  const updateVideoBlock = (id: string, field: "url" | "title" | "channelName", value: string) => {
    setBlocks(prev => prev.map(b => b.id === id && b.type === "video" ? { ...b, [field]: value } : b));
    setHasChanges(true);
  };

  const confirmVideoChannel = (id: string, officialChannelConfirmed: boolean) => {
    setBlocks(prev => prev.map(b => b.id === id && b.type === "video" ? { ...b, officialChannelConfirmed } : b));
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
    if (isLoading) return;
    try {
      setIsSaving(true);
      setError(null);

      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      if (!title.trim()) throw new Error("O título é obrigatório");
      if (!cleanSlug) throw new Error("O slug é obrigatório");

      const parsedSources = parseEditorialSources(sourcesText);

      if (isPublished) {
        const validationErrors = validateEditorialContent({
          slug: cleanSlug,
          title: title.trim(),
          summary: summary.trim(),
          imageUrl: imageUrl.trim(),
          imageAlt: imageAlt.trim(),
          blocks,
          shortArticleReason,
          absenceRegistered,
          editorialMetadata: {
            informationStatus,
            quote: quoteText.trim()
              ? { text: quoteText.trim(), author: quoteAuthor.trim(), role: quoteRole.trim(), sourceUrl: quoteSourceUrl.trim(), sourceVerified: quoteSourceVerified }
              : null,
            sources: parsedSources,
            correctionNote: correctionNote.trim() || null,
          },
        });
        if (validationErrors.length > 0) throw new Error(validationErrors[0]);
      }

      const bodyJson = JSON.stringify(blocks);

      const basePostData = {
        title: title.trim(),
        slug: cleanSlug,
        summary: summary.trim(),
        body: bodyJson,
        category,
        topic_id: topicId && topicId.trim() !== "" ? topicId.trim() : null,
        image_url: imageUrl.trim() || null,
        image_alt: imageAlt.trim() || null,
        author_name: authorName.trim() || "Redação",
        author_tag: authorTag || AUTHOR_TAGS[category] || null,
        is_published: isPublished,
        published_at: isPublished ? (publishedAt || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };

      const extendedPostData = {
        ...basePostData,
        information_status: informationStatus,
        featured_quote: quoteText.trim()
          ? { text: quoteText.trim(), author: quoteAuthor.trim(), role: quoteRole.trim(), source_url: quoteSourceUrl.trim(), source_verified: quoteSourceVerified, absence_registered: false }
          : absenceRegistered ? { absence_registered: true } : null,
        editorial_sources: parsedSources,
        short_article_reason: shortArticleReason.trim() || null,
        correction_note: correctionNote.trim() || null,
        scheduled_at: scheduledAt && !isPublished ? scheduledAt : null,
      };

      let savedPostId = postId;
      if (postId) {
        const { data: updatedPost, error: updateErr } = await supabase
          .from("posts")
          .update(extendedPostData)
          .eq("id", postId)
          .select("id")
          .maybeSingle();
        if (updateErr) {
          if (updateErr.message?.includes("Could not find the") && updateErr.message?.includes("column")) {
            if (isPublished) throw new Error("Aplique as migrations editoriais pendentes antes de publicar esta matéria.");
            const { data: fallbackPost, error: fallbackErr } = await supabase
              .from("posts")
              .update(basePostData)
              .eq("id", postId)
              .select("id")
              .maybeSingle();
            if (fallbackErr) throw fallbackErr;
            if (!fallbackPost) throw new Error("Matéria não encontrada. O rascunho local foi mantido.");
          } else {
            throw updateErr;
          }
        } else if (!updatedPost) {
          throw new Error("Matéria não encontrada. O rascunho local foi mantido.");
        }
      } else {
        const { data: insertedData, error: insertErr } = await supabase.from("posts").insert([extendedPostData]).select("id").single();
        if (insertErr) {
          if (insertErr.message?.includes("Could not find the") && insertErr.message?.includes("column")) {
            if (isPublished) throw new Error("Aplique as migrations editoriais pendentes antes de publicar esta matéria.");
            const { data: fallbackData, error: fallbackErr } = await supabase.from("posts").insert([basePostData]).select("id").single();
            if (fallbackErr) throw fallbackErr;
            if (typeof fallbackData?.id !== "string") throw new Error("Não foi possível confirmar a matéria salva.");
            savedPostId = fallbackData.id;
          } else {
            throw insertErr;
          }
        } else {
          if (typeof insertedData?.id !== "string") throw new Error("Não foi possível confirmar a matéria salva.");
          savedPostId = insertedData.id;
        }
      }

      if (isPublished && savedPostId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingThread } = await supabase
            .from("community_posts")
            .select("id")
            .eq("source_post_id", savedPostId)
            .eq("is_official_thread", true)
            .maybeSingle();

          const attachedArticle = {
            id: savedPostId,
            slug: cleanSlug,
            title: title.trim(),
            summary: summary.trim(),
            image_url: imageUrl.trim() || null,
            category,
            topic_id: topicId && topicId.trim() !== "" ? topicId.trim() : null,
          };

          if (existingThread && typeof existingThread.id === "string") {
            await supabase
              .from("community_posts")
              .update({
                content: summary.trim().slice(0, 280),
                attached_article: attachedArticle,
                topic_id: topicId && topicId.trim() !== "" ? topicId.trim() : null,
              })
              .eq("id", existingThread.id);
          } else {
            await supabase.from("community_posts").insert({
              user_id: user.id,
              author_name: "Orange Brick",
              author_avatar: "",
              content: summary.trim().slice(0, 280),
              media_url: null,
              platform_tag: null,
              attached_article: attachedArticle,
              is_official: true,
              is_pinned: false,
              source_post_id: savedPostId,
              is_official_thread: true,
              topic_id: topicId && topicId.trim() !== "" ? topicId.trim() : null,
            });
          }
        }
      }

      setHasChanges(false);
      window.localStorage.removeItem(`orange-brick:article-draft:${postId || "new"}`);
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(errorMessage(err, "Erro ao salvar matéria"));
    } finally {
      setIsSaving(false);
    }
  };

  const discardLocalDraft = () => {
    window.localStorage.removeItem(`orange-brick:article-draft:${postId || "new"}`);
    setLocalDraft(null);
  };

  const restoreLocalDraft = () => {
    if (!localDraft) return;
    const draft = localDraft.data;
    setSlug(draft.slug || "");
    setTitle(draft.title || "");
    setSummary(draft.summary || "");
    setCategory(draft.category || "breaking");
    setTopicId(draft.topicId || "");
    setImageUrl(draft.imageUrl || "");
    setImageAlt(draft.imageAlt || "");
    setAuthorName(draft.authorName || "Redação");
    setAuthorTag(normalizeAuthorTag(draft.authorTag || AUTHOR_TAGS.breaking));
    setInformationStatus(draft.informationStatus || "confirmed");
    setQuoteText(draft.quoteText || "");
    setQuoteAuthor(draft.quoteAuthor || "");
    setQuoteRole(draft.quoteRole || "");
    setQuoteSourceUrl(draft.quoteSourceUrl || "");
    setQuoteSourceVerified(Boolean(draft.quoteSourceVerified));
    setSourcesText(draft.sourcesText || "");
    setShortArticleReason(draft.shortArticleReason || "");
    setAbsenceRegistered(Boolean(draft.absenceRegistered));
    setCorrectionNote(draft.correctionNote || "");
    setScheduledAt(draft.scheduledAt || null);
    setBlocks(Array.isArray(draft.blocks) ? draft.blocks : []);
    setHasChanges(false);
    setAutoSavedAt(localDraft.savedLabel);
    setLocalDraft(null);
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
          {hasChanges ? autoSavedAt ? `Rascunho local salvo às ${autoSavedAt}` : "Alterações não salvas" : postId ? "Matéria carregada" : "Nova matéria vazia"}
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
            disabled={isSaving || isLoading}
            className="min-h-11 rounded-lg border border-white/15 bg-white/[0.04] px-3.5 text-xs font-bold text-gray-200 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
          >
            Salvar rascunho
          </button>

          {/* SPLIT ACTION BUTTON PUBLICAR */}
          <div className="flex items-center rounded-lg bg-brand-orange">
            <button
              type="button"
              onClick={() => setShowPublishConfirm(true)}
              disabled={isSaving || isLoading}
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

      {localDraft && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="text-xs leading-5 text-amber-200">
            Rascunho local de {localDraft.savedLabel} encontrado no navegador. Restaurar substitui o conteúdo carregado pelo backup mais recente.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={discardLocalDraft}
              className="min-h-11 rounded border border-white/15 px-4 text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={restoreLocalDraft}
              className="min-h-11 rounded bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-[#ff7526]"
            >
              Restaurar rascunho
            </button>
          </div>
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
              <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500 mb-1.5">
                <label htmlFor="article-title">Título da matéria</label>
                <span>{title.length} / 70</span>
              </div>
              <input
                id="article-title"
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                maxLength={70}
                placeholder="Insira o título da matéria..."
                className="h-11 w-full rounded-lg border border-white/10 bg-background-void px-4 font-heading text-sm font-black uppercase text-white outline-none focus:border-brand-orange/50 transition-colors"
              />
            </div>

            {/* RESUMO EDITORIAL */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500 mb-1.5">
                <label htmlFor="article-summary">Resumo editorial</label>
                <div className="flex items-center gap-1.5">
                  <span>{summary.length} / 180</span>
                  {summary.length >= 80 && summary.length <= 180 && <span className="text-emerald-400">✓</span>}
                </div>
              </div>
              <textarea
                id="article-summary"
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setHasChanges(true); }}
                maxLength={180}
                rows={3}
                placeholder="Insira uma breve descrição da matéria..."
                className="w-full rounded-lg border border-white/10 bg-background-void p-3 text-xs text-gray-200 outline-none focus:border-brand-orange/50 transition-colors leading-relaxed"
              />
            </div>

            {/* SLUG */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500 mb-1">
                <span>Slug</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-background-void px-3 py-2 text-xs">
                <span className="truncate font-mono text-gray-400">
                  /posts/<span className="text-white font-bold">{slug}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingSlug(!isEditingSlug)}
                  aria-label={isEditingSlug ? "Fechar edição do slug" : "Editar slug"}
                  className="text-gray-400 hover:text-white text-xs shrink-0"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
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
                  <div className="flex flex-col items-center gap-1 pt-2 text-gray-600 opacity-50 group-hover:opacity-100">
                    <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0} aria-label={`Mover bloco ${index + 1} para cima`} className="min-h-6 min-w-6 hover:text-white disabled:opacity-20 text-xs">▲</button>
                    <span className="text-xs" aria-hidden="true">⋮⋮</span>
                    <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blocks.length - 1} aria-label={`Mover bloco ${index + 1} para baixo`} className="min-h-6 min-w-6 hover:text-white disabled:opacity-20 text-xs">▼</button>
                  </div>

                  {/* CONTEÚDO DO BLOCO */}
                  <div className="flex-1 min-w-0">
                    {block.type === "text" ? (
                      <textarea
                        value={block.content}
                        onChange={(e) => updateTextBlock(block.id, e.target.value)}
                        rows={Math.max(2, block.content.split("\n").length)}
                        placeholder="Digite o texto do parágrafo ou markdown..."
                        aria-label={`Conteúdo do bloco ${index + 1}`}
                        className="w-full bg-transparent p-2 text-xs leading-relaxed text-gray-200 outline-none font-sans"
                      />
                    ) : block.type === "image" ? (
                      <div className="space-y-2 p-2">
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-void border border-white/10">
                          {block.url ? (
                            <img loading="lazy" decoding="async" src={block.url} alt={block.alt} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-600">
                              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                <rect x="3" y="6" width="18" height="14" rx="2" />
                                <circle cx="12" cy="13" r="3.5" />
                                <path d="M8 6l1.5-2.5h5L16 6" />
                              </svg>
                              <span className="text-xs">Insira a URL da imagem abaixo</span>
                            </div>
                          )}
                        </div>
                        <label htmlFor={`image-url-${block.id}`} className="sr-only">URL da imagem do bloco {index + 1}</label>
                        <input
                          id={`image-url-${block.id}`}
                          type="url"
                          value={block.url}
                          onChange={(e) => updateImageBlock(block.id, "url", e.target.value)}
                          placeholder="URL da imagem (https://...)"
                          className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white font-mono outline-none"
                        />
                        <label htmlFor={`image-alt-${block.id}`} className="block text-xs font-semibold text-gray-300">Texto alternativo (descreva a imagem)</label>
                        <input
                          id={`image-alt-${block.id}`}
                          type="text"
                          value={block.alt}
                          onChange={(e) => updateImageBlock(block.id, "alt", e.target.value)}
                          placeholder="Ex.: Console Nintendo Switch 2 sobre mesa"
                          className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none focus:border-brand-orange/50"
                        />
                        <label htmlFor={`image-caption-${block.id}`} className="block text-xs font-semibold text-gray-300">Legenda da imagem</label>
                        <input
                          id={`image-caption-${block.id}`}
                          type="text"
                          value={block.caption || ""}
                          onChange={(e) => updateImageBlock(block.id, "caption", e.target.value)}
                          placeholder="Legenda da imagem..."
                          className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-gray-300 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 p-2">
                        <div className="aspect-video w-full overflow-hidden border border-white/10 bg-background-void">
                          {youtubeEmbedUrl(block.url) ? (
                            <iframe
                              src={youtubeEmbedUrl(block.url) || undefined}
                              title={block.title || "Prévia do trailer"}
                              className="h-full w-full"
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-500">
                              Insira o endereço do trailer oficial no YouTube
                            </div>
                          )}
                        </div>
                        <label htmlFor={`video-url-${block.id}`} className="block text-xs font-semibold text-gray-300">URL do trailer oficial</label>
                        <input
                          id={`video-url-${block.id}`}
                          type="url"
                          value={block.url}
                          onChange={(e) => updateVideoBlock(block.id, "url", e.target.value)}
                          placeholder="URL oficial do YouTube"
                          className="min-h-11 w-full border border-white/10 bg-background-void px-3 text-base font-mono text-white outline-none focus:border-brand-orange/50 sm:text-sm"
                        />
                        <label htmlFor={`video-title-${block.id}`} className="block text-xs font-semibold text-gray-300">Título acessível</label>
                        <input
                          id={`video-title-${block.id}`}
                          type="text"
                          value={block.title}
                          onChange={(e) => updateVideoBlock(block.id, "title", e.target.value)}
                          placeholder="Título acessível do trailer"
                          className="min-h-11 w-full border border-white/10 bg-background-void px-3 text-base text-gray-200 outline-none focus:border-brand-orange/50 sm:text-sm"
                        />
                        <label htmlFor={`video-channel-${block.id}`} className="block text-xs font-semibold text-gray-300">Canal oficial responsável</label>
                        <input
                          id={`video-channel-${block.id}`}
                          type="text"
                          value={block.channelName || ""}
                          onChange={(event) => updateVideoBlock(block.id, "channelName", event.target.value)}
                          placeholder="Nome do estúdio, publisher ou evento"
                          className="min-h-11 w-full border border-white/10 bg-background-void px-3 text-base text-gray-200 outline-none focus:border-brand-orange/50 sm:text-sm"
                        />
                        <label className="flex min-h-11 items-start gap-3 rounded border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-300">
                          <input type="checkbox" checked={Boolean(block.officialChannelConfirmed)} onChange={(event) => confirmVideoChannel(block.id, event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-500" />
                          <span>Confirmei que o vídeo está disponível no canal oficial e corresponde à matéria.</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* BOTÃO DE REMOVER BLOCO */}
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="min-h-8 min-w-8 p-1 text-gray-600 hover:text-red-400 transition-colors"
                    title="Remover bloco"
                    aria-label={`Remover bloco ${index + 1}`}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className="h-3.5 w-3.5" strokeWidth="2" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
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
                onClick={() => addBlock("video")}
                className="min-h-11 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                + Trailer
              </button>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: SIDEBAR DE CONFIGURAÇÕES E CHECKLIST ── */}
        <aside className="space-y-4">
          {/* PAINEL DE PUBLICAÇÃO */}
          <div className="rounded-b-xl border-x border-b border-white/10 bg-[#0e0f14] p-4 space-y-4">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Publicação</h3>

            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                <div className="inline-block rounded border border-white/15 bg-background-void px-2.5 py-1.5 text-xs font-bold text-gray-300">
                  {publishedAt ? "Publicada" : scheduledAt ? "Agendada" : "Rascunho"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Responsável</label>
                <select
                  value={authorName}
                  onChange={(e) => { setAuthorName(e.target.value); setHasChanges(true); }}
                  className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none"
                >
                  {(authorName && !AUTHOR_OPTIONS.includes(authorName) ? [authorName, ...AUTHOR_OPTIONS] : AUTHOR_OPTIONS).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {!publishedAt && (
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Agendar publicação</label>
                <input
                  type="datetime-local"
                  value={scheduledAt ? scheduledAt.slice(0, 16) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScheduledAt(val ? new Date(val).toISOString() : null);
                    setHasChanges(true);
                  }}
                  className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none focus:border-brand-orange/40"
                />
                {scheduledAt && (
                  <button
                    type="button"
                    onClick={() => { setScheduledAt(null); setHasChanges(true); }}
                    className="mt-1 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Limpar agendamento
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value as PostCategory); setHasChanges(true); }}
                className="h-8 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Tópicos</label>
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
              <label htmlFor="information-status" className="mb-1 block text-xs font-bold text-gray-500">Estado da informação</label>
              <select id="information-status" value={informationStatus} onChange={(event) => { setInformationStatus(event.target.value as InformationStatus); setHasChanges(true); }} className="h-9 w-full rounded border border-white/10 bg-[#0e0f14] px-2 text-xs text-white outline-none focus:border-brand-orange/50">
                <option value="confirmed">Confirmada</option>
                <option value="developing">Em desenvolvimento</option>
                <option value="rumor">Rumor não confirmado</option>
                <option value="updated">Atualizada</option>
                <option value="corrected">Corrigida</option>
              </select>
            </div>

            {(informationStatus === "corrected" || correctionNote) && <div>
              <label htmlFor="correction-note" className="mb-1 block text-xs font-bold text-gray-500">Nota de correção</label>
              <textarea id="correction-note" value={correctionNote} onChange={(event) => { setCorrectionNote(event.target.value); setHasChanges(true); }} rows={3} maxLength={500} placeholder="Explique com clareza o que foi corrigido." className="w-full rounded border border-white/10 bg-background-void p-2 text-xs leading-relaxed text-white outline-none focus:border-brand-orange/50" />
            </div>}

            <div>
              <label htmlFor="short-article-reason" className="mb-1 block text-xs font-bold text-gray-500">Justificativa para matéria curta</label>
              <textarea id="short-article-reason" value={shortArticleReason} onChange={(event) => { setShortArticleReason(event.target.value); setHasChanges(true); }} rows={3} maxLength={500} placeholder="Obrigatória quando o corpo tiver menos de 700 palavras." className="w-full rounded border border-white/10 bg-background-void p-2 text-xs leading-relaxed text-white outline-none focus:border-brand-orange/50" />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div><h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Fala em destaque</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">A publicação exige uma página específica e a confirmação do texto e da autoria.</p></div>
            <textarea value={quoteText} onChange={(event) => { setQuoteText(event.target.value); setQuoteSourceVerified(false); setHasChanges(true); }} rows={4} maxLength={500} placeholder="Declaração exata, sem aspas" aria-label="Declaração em destaque" className="w-full rounded border border-white/10 bg-background-void p-2 text-xs text-white outline-none focus:border-brand-orange/50" />
            <div className="grid gap-2 xs:grid-cols-2"><label className="space-y-1 text-xs font-bold text-gray-300">Nome da pessoa<input value={quoteAuthor} onChange={(event) => { setQuoteAuthor(event.target.value); setQuoteSourceVerified(false); setHasChanges(true); }} placeholder="Ex.: Phil Spencer" className="min-h-11 w-full rounded border border-white/10 bg-background-void px-3 text-sm font-normal text-white outline-none focus:border-brand-orange/50" /></label><label className="space-y-1 text-xs font-bold text-gray-300">Cargo ou função<input value={quoteRole} onChange={(event) => { setQuoteRole(event.target.value); setQuoteSourceVerified(false); setHasChanges(true); }} placeholder="Ex.: CEO da Microsoft Gaming" className="min-h-11 w-full rounded border border-white/10 bg-background-void px-3 text-sm font-normal text-white outline-none focus:border-brand-orange/50" /></label></div>
            <label className="space-y-1 text-xs font-bold text-gray-300">URL da declaração<input type="url" value={quoteSourceUrl} onChange={(event) => { setQuoteSourceUrl(event.target.value); setQuoteSourceVerified(false); setHasChanges(true); }} placeholder="https://fonte-da-declaracao.com" className="min-h-11 w-full rounded border border-white/10 bg-background-void px-3 text-sm font-normal text-white outline-none focus:border-brand-orange/50" /></label>
            <label className="flex min-h-11 items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-300">
              <input type="checkbox" checked={quoteSourceVerified} disabled={!quoteText.trim()} onChange={(event) => { setQuoteSourceVerified(event.target.checked); setHasChanges(true); }} className="mt-0.5 h-4 w-4 accent-orange-500" />
              <span>Confirmei o texto e a atribuição da fala na fonte original.</span>
            </label>
            <label className="flex min-h-11 items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-300">
              <input type="checkbox" checked={absenceRegistered} onChange={(event) => { setAbsenceRegistered(event.target.checked); setHasChanges(true); }} className="mt-0.5 h-4 w-4 accent-orange-500" />
              <span>Confirmei na apuração que não há declaração pública relevante disponível.</span>
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div><h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Fontes consultadas</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">Uma por linha: Nome|URL. Use |oficial quando for comunicado oficial e |verificada após conferir a página e sua relevância.</p></div>
            <textarea value={sourcesText} onChange={(event) => { setSourcesText(event.target.value); setHasChanges(true); }} rows={5} spellCheck={false} placeholder={"Xbox Wire|https://news.xbox.com/article/slug|oficial|verificada\nVGC|https://videogameschronicle.com/article/slug|verificada"} aria-label="Fontes da matéria, uma por linha no formato Nome|URL, com marcadores oficial e verificada opcionais" className="w-full rounded border border-white/10 bg-background-void p-2 font-mono text-xs leading-relaxed text-white outline-none focus:border-brand-orange/50" />
          </div>

          {/* WIDGET IMAGEM DE CAPA */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">Imagem de capa</h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-background-void border border-white/10">
              {imageUrl ? (
                <img loading="lazy" decoding="async" src={imageUrl} alt="" className="h-full w-full object-cover" />
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
                aria-label="URL da imagem de capa"
                className="h-8 flex-1 rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="h-8 px-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 rounded border border-red-500/20"
              >
                Remover
              </button>
            </div>
            <input
              type="text"
              value={imageAlt}
              onChange={(event) => { setImageAlt(event.target.value); setHasChanges(true); }}
              placeholder="Descreva a imagem de capa"
              aria-label="Texto alternativo da imagem de capa"
              className="h-8 w-full rounded border border-white/10 bg-background-void px-2 text-xs text-white outline-none"
            />
          </div>

          <EditorialQualityChecklist
            title={title}
            summary={summary}
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            body={blocks}
            sourcesText={sourcesText}
            quoteText={quoteText}
            quoteAuthor={quoteAuthor}
            quoteRole={quoteRole}
            quoteSourceUrl={quoteSourceUrl}
            absenceRegistered={absenceRegistered}
            informationStatus={informationStatus}
            correctionNote={correctionNote}
            shortArticleReason={shortArticleReason}
          />
        </aside>
      </div>

      {/* MODAL DE PREVIEW */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowPreview(false)}>
          <div ref={previewRef} role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" tabIndex={-1} className="max-h-[calc(100dvh-1rem)] w-full max-w-4xl space-y-4 overflow-y-auto rounded-lg border border-white/10 bg-[#0e0f14] p-4 text-white focus:outline-none sm:max-h-[90vh] sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="preview-dialog-title" className="font-heading text-lg font-bold">Pré-visualização da Matéria</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="min-h-11 min-w-11 text-gray-400 hover:text-white" aria-label="Fechar pré-visualização">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" className="mx-auto h-4 w-4" strokeWidth="2" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
              </button>
            </div>
            <h1 className="font-heading text-2xl font-black">{title}</h1>
            <p className="text-sm text-gray-300 leading-relaxed italic">{summary}</p>
            {imageUrl && <img loading="lazy" decoding="async" src={imageUrl} alt="" className="w-full aspect-video object-cover rounded-lg" />}
            <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-4">
              {blocks.map(b => (
                <div key={b.id}>
                  {b.type === "text" ? parseMarkdownToReact(b.content) : b.type === "image" ? (
                    <div>
                      {b.url && <img loading="lazy" decoding="async" src={b.url} alt={b.alt} className="w-full aspect-video object-cover rounded-lg" />}
                      {b.caption && <p className="text-xs text-center text-gray-500 mt-1">{b.caption}</p>}
                    </div>
                  ) : youtubeEmbedUrl(b.url) ? (
                    <figure className="space-y-2">
                      <div className="aspect-video overflow-hidden border border-white/10 bg-background-void">
                        <iframe src={youtubeEmbedUrl(b.url) || undefined} title={b.title} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      </div>
                      <figcaption className="text-center text-xs text-gray-400">{b.title}</figcaption>
                    </figure>
                  ) : (
                    <p className="text-sm text-red-300">Trailer com URL inválida.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPublishConfirm && (
        <PublishConfirmModal
          title={title}
          publishing={isSaving}
          error={error}
          pendingChecklist={editorialChecklist.filter((item) => !item.complete).map((item) => item.label)}
          onConfirm={() => void handleSave(true)}
          onCancel={() => setShowPublishConfirm(false)}
        />
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
