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
                <div className="relative overflow-hidden rounded-2xl border border-brand-orange-muted/15 shadow-xl bg-card-slate/40">
                  <img
                    src={block.url}
                    alt={block.alt || post.title}
                    className="w-full h-auto object-cover max-h-[550px]"
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

export function PostArticle({ post, stats }: PostArticleProps) {
  const router = useRouter();
  const { user } = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const { counts, userReaction, isPending, error: reactionError, toggleReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
  });
  const { count: viewCount } = usePostViews({
    postId: post.id,
    initialCount: stats.views,
  });
  const { comments, isLoading: commentsLoading, error: commentsError, fetchComments, addComment, deleteComment } = useComments(post.id);
  const { addPost: addCommunityBrick } = useCommunityFeed();
  const [isBrickModalOpen, setIsBrickModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => void fetchComments());
  }, [fetchComments]);

  const handleRepostClick = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsBrickModalOpen(true);
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
    <div className="min-h-dvh bg-background-void text-white font-body pb-24">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-3 sm:py-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-2">
          <button
            onClick={() => router.push("/")}
            className="text-[10px] sm:text-xs text-gray-400 hover:text-white cursor-pointer transition-colors flex items-center gap-1 sm:gap-2 shrink-0 font-subtitle font-semibold"
          >
            ← <span className="hidden xs:inline">Voltar</span> Home
          </button>
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0" onClick={() => router.push("/")}>
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-8 sm:h-9 w-auto max-h-9 object-contain transform group-hover:scale-[1.05] transition-transform duration-200 shrink-0" />
            <span className="hidden sm:inline text-base font-heading font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors whitespace-nowrap">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <article className="space-y-6">
          <div className="flex items-center gap-3">
            <Tag category={post.category} />
            <Timer date={post.published_at ?? ""} />
          </div>

          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white uppercase leading-tight tracking-tight">
            {post.title}
          </h1>
          <p className="text-sm xs:text-base text-gray-400 font-sans border-l-2 border-brand-orange pl-3 sm:pl-4 py-1 leading-relaxed">
            {post.summary}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500 py-2 border-y border-brand-orange-muted/10">
            <span>
              Por <span className="text-white font-bold">{post.author_name}</span>
            </span>
            {post.author_tag && (
              <>
                <span>•</span>
                <span className="text-brand-orange-muted font-bold">{post.author_tag}</span>
              </>
            )}
            <span className="flex-1" />
            <span className="flex items-center gap-1.5 text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7ZM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5ZM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z" />
              </svg>
              <span className="text-[10px] font-mono">{viewCount} visualizações</span>
            </span>
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

        <div id="comments-section" className="mt-14 pt-10 border-t border-brand-orange-muted/15 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-6 bg-brand-orange rounded-full shadow-[0_0_12px_#FF5E00]" />
              <h3 className="font-heading text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                Comentários da Comunidade ({comments.length})
              </h3>
            </div>

            <button
              onClick={handleRepostClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card-slate/80 border border-brand-orange/40 hover:bg-brand-orange hover:text-white text-brand-orange font-subtitle text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,94,0,0.15)] hover:scale-[1.02] cursor-pointer"
            >
              <span>🧱 Republicar no Brickboard</span>
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
