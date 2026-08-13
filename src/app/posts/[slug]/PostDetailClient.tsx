"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseMarkdownToReact } from "@/lib/markdown";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentList } from "@/components/comments/CommentList";
import { CommentForm } from "@/components/comments/CommentForm";
import { ComposeBrickModal } from "@/components/community/ComposeBrickModal";
import { useCommunityFeed } from "@/lib/hooks/useCommunityFeed";
import { useReactions } from "@/lib/hooks/useReactions";
import { usePostViews } from "@/lib/hooks/usePostViews";
import { useComments } from "@/lib/hooks/useComments";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { Footer } from "@/components/ui/Footer";
import { BookmarkIcon, RepostIcon, SocialLogo } from "@/components/ui/ContentActionIcons";
import { ArticleHypeSummary } from "@/components/releases/ArticleHypeSummary";
import { createDataClient } from "@/lib/supabase/client";
import { normalizeAuthorTag } from "@/lib/content-validation";
import type { Post, PostStats } from "@/lib/types/database";
import { ArticleCommunityNotes } from "@/components/community/ArticleCommunityNotes";
import { youtubeEmbedUrl } from "@/lib/youtube";

type ContentBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string }
  | { id: string; type: "video"; url: string; title: string };

function PostContent({ post }: { post: Post }) {
  const blocks = useMemo<ContentBlock[] | null>(() => {
    try {
      const parsed: unknown = JSON.parse(post.body);
      if (Array.isArray(parsed)) {
        return parsed as ContentBlock[];
      }
    } catch {
      return null;
    }
    return null;
  }, [post.body]);

  if (blocks) {
    const renderedUrls = new Set<string>();

    return (
      <div className="space-y-6">
        {blocks.map((block) => {
          if (block.type === "text") {
            return <div key={block.id}>{parseMarkdownToReact(block.content)}</div>;
          }
          if (block.type === "image") {
            if (!block.url || renderedUrls.has(block.url)) {
              return null;
            }
            renderedUrls.add(block.url);

            return (
              <div key={block.id} className="my-8 flex flex-col gap-2">
                <div className="relative overflow-hidden rounded-2xl border border-brand-orange-muted/20 shadow-xl bg-[#08090C] flex items-center justify-center p-1 sm:p-2">
                  <img
                    src={block.url}
                    alt={block.alt || post.title}
                    className="w-full h-auto max-h-[650px] object-contain rounded-xl"
                    loading="lazy"
                  />
                </div>
                {block.caption && (
                  <span className="text-xs font-subtitle text-gray-400 text-center italic">
                    {block.caption}
                  </span>
                )}
              </div>
            );
          }
          if (block.type === "video") {
            const embedUrl = youtubeEmbedUrl(block.url);
            if (!embedUrl) return null;
            return (
              <figure key={block.id} className="my-8 space-y-2">
                <div className="aspect-video overflow-hidden border border-white/10 bg-[#08090C]">
                  <iframe
                    src={embedUrl}
                    title={block.title}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <figcaption className="text-center font-subtitle text-xs text-gray-400">{block.title}</figcaption>
              </figure>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return <div>{parseMarkdownToReact(post.body)}</div>;
}

function getEditorialSignals(post: Post) {
  const plain = post.body.replace(/\\n/g, "\n");
  const structuredQuote = post.featured_quote && typeof post.featured_quote === "object" && !Array.isArray(post.featured_quote) ? post.featured_quote as { text?: string; author?: string; role?: string; source_url?: string } : null;
  const links = [...plain.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)].map((match) => ({ name: match[1], url: match[2] }));
  const structuredSources = Array.isArray(post.editorial_sources) ? post.editorial_sources.filter((source): source is { name: string; url: string } => Boolean(source && typeof source === "object" && "name" in source && "url" in source)) : [];
  const sourcePool = structuredSources.length ? structuredSources : links;
  const uniqueSources = sourcePool.filter((source, index) => sourcePool.findIndex((item) => item.url === source.url) === index).slice(0, 6);
  return { quote: structuredQuote?.text || null, quoteAuthor: structuredQuote?.author, quoteRole: structuredQuote?.role, quoteSourceUrl: structuredQuote?.source_url, sources: uniqueSources };
}

const INFORMATION_STATUS_LABELS: Record<Post["information_status"], string> = {
  confirmed: "Informação confirmada",
  developing: "Notícia em desenvolvimento",
  rumor: "Rumor não confirmado",
  updated: "Matéria atualizada",
  corrected: "Matéria corrigida",
};

interface PostArticleProps {
  post: Post;
  stats: PostStats;
}

import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";

export function PostArticle({ post, stats }: PostArticleProps) {
  const router = useRouter();
  const supabase = useMemo(() => createDataClient(), []);
  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(post.id);
  const { counts, userReaction, isPending, error: reactionError, toggleReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });
  const { count: viewCount, registerView } = usePostViews({
    postId: post.id,
    initialCount: stats.views,
  });
  const { comments, isLoading: commentsLoading, error: commentsError, fetchComments, addComment, deleteComment } = useComments(post.id);
  const { addPost: addCommunityBrick } = useCommunityFeed({ load: false });
  const [isBrickModalOpen, setIsBrickModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [readerScale, setReaderScale] = useState(1);
  const [shareNotice, setShareNotice] = useState("");
  const [conversationCount, setConversationCount] = useState(0);
  const editorialSignals = useMemo(() => getEditorialSignals(post), [post]);

  useEffect(() => {
    queueMicrotask(() => void fetchComments());
  }, [fetchComments]);

  useEffect(() => {
    void registerView();
  }, [registerView]);

  useEffect(() => {
    const saveProgress = () => {
      const root = document.documentElement;
      const available = root.scrollHeight - window.innerHeight;
      if (available <= 0) return;
      const progress = Math.min(100, Math.max(1, Math.round(window.scrollY / available * 100)));
      try {
        const current = JSON.parse(localStorage.getItem("orange-reading-progress") || "[]") as Array<{ slug: string; title: string; progress: number; updatedAt: string }>;
        const next = [{ slug: post.slug, title: post.title, progress, updatedAt: new Date().toISOString() }, ...current.filter((item) => item.slug !== post.slug)].slice(0, 12);
        localStorage.setItem("orange-reading-progress", JSON.stringify(next));
      } catch {}
    };
    window.addEventListener("scroll", saveProgress, { passive: true });
    return () => { saveProgress(); window.removeEventListener("scroll", saveProgress); };
  }, [post.slug, post.title]);

  useEffect(() => {
    async function loadConversationCount() {
      const { count } = await supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .contains("attached_article", { slug: post.slug });
      setConversationCount(count || 0);
    }

    void loadConversationCount();
  }, [post.slug, supabase]);

  const handleRepostClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBrickModalOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/posts/${post.slug}`;
  const shareText = `Confira no Orange Brick: "${post.title}"`;
  const articleWordCount = useMemo(() => post.body.replace(/<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, " ").trim().split(/\s+/).filter(Boolean).length, [post.body]);
  const readingMinutes = Math.max(1, Math.ceil(articleWordCount / 200));

  useEffect(() => {
    const saved = Number(window.localStorage.getItem("orange-reader-scale"));
    if (saved >= 0.9 && saved <= 1.2) setReaderScale(saved);
  }, []);

  const adjustReaderScale = (next: number) => {
    const value = Math.min(1.2, Math.max(0.9, next));
    setReaderScale(value);
    window.localStorage.setItem("orange-reader-scale", String(value));
  };

  const handleQuickShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: post.title, text: post.summary, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareNotice("Link copiado para a área de transferência!");
    window.setTimeout(() => setShareNotice(""), 3000);
  };

  const handleShareSocial = (platform: "whatsapp" | "twitter" | "telegram") => {
    let url = "";
    if (platform === "whatsapp") {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    } else if (platform === "telegram") {
      url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const attachedArticle = useMemo(
    () => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      image_url: post.image_url || undefined,
      category: post.category,
      topic_id: post.topic_id,
    }),
    [post]
  );

  const conversationUrl = useMemo(() => {
    if (conversationCount > 0) {
      return `/brickboard?article=${encodeURIComponent(post.slug)}`;
    }

    const params = new URLSearchParams({
      attach: post.slug,
      title: post.title,
      summary: post.summary,
      cat: post.category,
    });
    if (post.image_url) params.set("img", post.image_url);
    return `/brickboard?${params.toString()}`;
  }, [conversationCount, post]);

  return (
    <div className="min-h-dvh min-w-0 bg-background-void pb-16 text-white sm:pb-24">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-3 sm:py-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 sm:px-4">
          <button
            onClick={() => router.push("/")}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-[10px] font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:gap-2 sm:text-xs"
          >
            ← <span className="hidden xs:inline">Voltar</span> Home
          </button>
          <button
            type="button"
            aria-label="Ir para a página inicial"
            className="group flex min-h-11 min-w-11 items-center justify-end gap-2 rounded-xl sm:gap-3"
            onClick={() => router.push("/")}
          >
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }} className="h-7 sm:h-8 w-auto max-h-8 object-contain transform group-hover:scale-105 transition-transform duration-200 shrink-0" />
            <span className="hidden sm:inline text-base font-heading font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-3xl px-3 py-6 sm:px-4 sm:py-10">
        <article className="space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <Tag category={post.category} />
              <Timer date={post.published_at ?? ""} />
            </div>
            <button
              type="button"
              onClick={() => toggleBookmark(post)}
              aria-pressed={bookmarked}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${
                bookmarked
                  ? "bg-brand-orange/10 text-brand-orange"
                  : "bg-card-slate text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <BookmarkIcon filled={bookmarked} />
              <span>{bookmarked ? "Matéria salva" : "Salvar matéria"}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 text-xs text-gray-400">
            <span aria-label={`Tempo estimado de leitura: ${readingMinutes} minutos`}>◷ Tempo de leitura: <strong className="text-white">{readingMinutes} min</strong></span>
            <div className="flex items-center gap-1" aria-label="Ajustar tamanho do texto">
              <span className="mr-1 text-[11px]">Texto</span>
              <button type="button" onClick={() => adjustReaderScale(readerScale - 0.1)} disabled={readerScale <= 0.9} className="min-h-11 min-w-11 border border-white/15 text-sm font-bold text-white disabled:opacity-40" aria-label="Diminuir tamanho do texto">A−</button>
              <button type="button" onClick={() => adjustReaderScale(1)} className="min-h-11 min-w-11 border border-white/15 text-[11px] text-gray-300" aria-label="Restaurar tamanho do texto">A</button>
              <button type="button" onClick={() => adjustReaderScale(readerScale + 0.1)} disabled={readerScale >= 1.2} className="min-h-11 min-w-11 border border-white/15 text-base font-bold text-white disabled:opacity-40" aria-label="Aumentar tamanho do texto">A+</button>
            </div>
          </div>

          <h1 className="break-words font-heading text-[clamp(1.5rem,8vw,3rem)] font-black uppercase leading-tight tracking-tight text-white">
            {post.title}
          </h1>
          <p className="text-sm xs:text-base text-gray-200 font-body border-l-2 border-brand-orange pl-3 sm:pl-4 py-1 leading-relaxed">
            {post.summary}
          </p>

          <section className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-[1fr_auto]">
            <div className="bg-[#111217] p-4 sm:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">O que importa</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-200">{post.summary}</p>
            </div>
            <div className="flex min-w-36 items-center bg-[#111217] p-4 text-xs font-bold text-gray-400">
              <span className={`mr-2 h-2 w-2 ${post.information_status === "rumor" ? "bg-amber-400" : post.information_status === "corrected" ? "bg-sky-400" : "bg-emerald-400"}`} /> {INFORMATION_STATUS_LABELS[post.information_status || "confirmed"]}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-y border-brand-orange-muted/10 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>
                Por <span className="text-white font-bold">{post.author_name}</span>
              </span>
              {post.author_tag && (
                <>
                  <span>•</span>
                  <span className="text-brand-orange-muted font-bold">{normalizeAuthorTag(post.author_tag)}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Compartilhar</span>
              <button type="button" onClick={() => void handleQuickShare()} aria-label="Compartilhar matéria" className="min-h-11 border border-brand-orange/30 px-3 text-[11px] font-bold text-brand-orange transition-colors hover:bg-brand-orange/10">Compartilhar</button>
              <button
                onClick={() => handleShareSocial("whatsapp")}
                aria-label="Compartilhar no WhatsApp"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/[0.08] text-[#25D366] transition-colors hover:bg-[#25D366]/10 hover:text-[#50e383]"
                title="Compartilhar no WhatsApp"
              >
                <SocialLogo network="whatsapp" />
              </button>
              <button
                onClick={() => handleShareSocial("telegram")}
                aria-label="Compartilhar no Telegram"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/[0.08] text-[#26A5E4] transition-colors hover:bg-[#26A5E4]/10 hover:text-[#62c3f2]"
                title="Compartilhar no Telegram"
              >
                <SocialLogo network="telegram" />
              </button>
              <button
                onClick={() => handleShareSocial("twitter")}
                aria-label="Compartilhar no X"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/[0.08] text-gray-200 transition-colors hover:bg-white/[0.07] hover:text-white"
                title="Compartilhar no X"
              >
                <SocialLogo network="x" />
              </button>
            </div>
          </div>

          <div className="mt-8" style={{ fontSize: `${readerScale}em` }}>
            <PostContent post={post} />
          </div>

          {editorialSignals.quote && <blockquote className="border-y border-brand-orange/40 py-7 sm:py-9">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">Fala em destaque</p>
            <p className="mt-3 font-heading text-xl font-bold leading-snug text-white sm:text-2xl">“{editorialSignals.quote}”</p>
            {editorialSignals.quoteAuthor && <footer className="mt-4 text-xs text-gray-400"><strong className="text-white">{editorialSignals.quoteAuthor}</strong>{editorialSignals.quoteRole ? ` — ${editorialSignals.quoteRole}` : ""}{editorialSignals.quoteSourceUrl && <a href={editorialSignals.quoteSourceUrl} target="_blank" rel="noreferrer" className="ml-2 font-bold text-brand-orange hover:text-white">Ver fonte ↗</a>}</footer>}
          </blockquote>}

          {post.information_status === "corrected" && post.correction_note && <aside className="border-y border-sky-400/40 bg-sky-400/[0.07] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Nota de correção</p><p className="mt-2 text-sm leading-relaxed text-white">{post.correction_note}</p></aside>}

        </article>

        <div className="mt-10 pt-8 border-t border-brand-orange-muted/10">
          <ReactionBar
            hype={counts.hype}
            flop={counts.flop}
            salty={counts.salty}
            onToggle={toggleReaction}
            activeReaction={userReaction}
            disabled={isPending}
            error={reactionError}
            commentCount={comments.length}
            onCommentClick={() => document.getElementById("comments-section")?.scrollIntoView({ behavior: "smooth" })}
            onRepostClick={handleRepostClick}
            viewCount={viewCount}
          />
        </div>

        <ArticleHypeSummary postSlug={post.slug} />
        <ArticleCommunityNotes postId={post.id} />

        <section className="mt-10 border-y border-brand-orange/30 bg-brand-orange/[0.05] px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-black uppercase text-white">
                Continue no Brickboard
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                {conversationCount > 0
                  ? `${conversationCount} ${conversationCount === 1 ? "leitor publicou" : "leitores publicaram"} sobre esta matéria.`
                  : "Abra a conversa e diga o que esta notícia muda para você."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(conversationUrl)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange px-5 text-xs font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-orange/90"
            >
              {conversationCount > 0 ? "Ver conversa" : "Abrir conversa"}
            </button>
          </div>
        </section>

        <div id="comments-section" className="mt-10 space-y-6 border-t border-brand-orange-muted/15 pt-8 sm:mt-14 sm:pt-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-brand-orange rounded-full shadow-[0_0_12px_#FF5E00]" />
              <h3 className="font-heading text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                Comentários da Comunidade ({comments.length})
              </h3>
            </div>

            <button
              onClick={handleRepostClick}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-orange/40 bg-card-slate/80 px-4 text-xs font-bold uppercase tracking-wider text-brand-orange transition-colors hover:bg-brand-orange hover:text-white xs:w-auto"
            >
              <RepostIcon />
              <span>Republicar no Brickboard</span>
            </button>
          </div>

          <CommentForm onSubmit={(content) => addComment(content)} />

          <div className="space-y-4 pt-2">
            <CommentList
              comments={comments}
              isLoading={commentsLoading}
              error={commentsError}
              onRetry={() => void fetchComments()}
              onDelete={(commentId) => void deleteComment(commentId)}
            />
          </div>
        </div>
      </main>

      <ComposeBrickModal
        isOpen={isBrickModalOpen}
        onClose={() => setIsBrickModalOpen(false)}
        initialArticle={attachedArticle}
        onPublish={(content, platformTag, article, mediaUrl) => {
          addCommunityBrick(content, platformTag, article, mediaUrl);
          router.push("/brickboard");
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {shareNotice && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 border border-brand-orange/50 bg-[#111217] px-4 py-3 text-xs font-bold text-white shadow-xl">{shareNotice}</div>}

      <Footer />
    </div>
  );
}
