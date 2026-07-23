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
import type { Post, PostStats } from "@/lib/types/database";

type ContentBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string };

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
          return null;
        })}
      </div>
    );
  }

  return <div>{parseMarkdownToReact(post.body)}</div>;
}

interface PostArticleProps {
  post: Post;
  stats: PostStats;
}

import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useBookmarks } from "@/lib/hooks/useBookmarks";

export function PostArticle({ post, stats }: PostArticleProps) {
  const router = useRouter();
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

  useEffect(() => {
    queueMicrotask(() => void fetchComments());
  }, [fetchComments]);

  useEffect(() => {
    void registerView();
  }, [registerView]);

  const handleRepostClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBrickModalOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : `/posts/${post.slug}`;
  const shareText = `Confira no Orange Brick: "${post.title}"`;

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
    }),
    [post]
  );

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

          <h1 className="break-words font-heading text-[clamp(1.5rem,8vw,3rem)] font-black uppercase leading-tight tracking-tight text-white">
            {post.title}
          </h1>
          <p className="text-sm xs:text-base text-gray-200 font-body border-l-2 border-brand-orange pl-3 sm:pl-4 py-1 leading-relaxed">
            {post.summary}
          </p>

          <div className="flex flex-col gap-3 border-y border-brand-orange-muted/10 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span>
                Por <span className="text-white font-bold">{post.author_name}</span>
              </span>
              {post.author_tag && (
                <>
                  <span>•</span>
                  <span className="text-brand-orange-muted font-bold">{post.author_tag}</span>
                </>
              )}
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
              <span className="col-span-3 text-[11px] font-semibold text-gray-500">Compartilhar</span>
              <button
                onClick={() => handleShareSocial("whatsapp")}
                aria-label="Compartilhar no WhatsApp"
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/10 hover:text-[#50e383] xs:text-xs"
              >
                <SocialLogo network="whatsapp" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => handleShareSocial("telegram")}
                aria-label="Compartilhar no Telegram"
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-[#26A5E4] transition-colors hover:bg-[#26A5E4]/10 hover:text-[#62c3f2] xs:text-xs"
              >
                <SocialLogo network="telegram" />
                <span>Telegram</span>
              </button>
              <button
                onClick={() => handleShareSocial("twitter")}
                aria-label="Compartilhar no X"
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-2 text-[10px] font-semibold text-gray-200 transition-colors hover:bg-white/[0.07] hover:text-white xs:text-xs"
              >
                <SocialLogo network="x" />
                <span>X</span>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <PostContent post={post} />
          </div>
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

      <Footer />
    </div>
  );
}
