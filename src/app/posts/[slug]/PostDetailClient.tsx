"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { parseMarkdownToReact } from "@/lib/markdown";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentList } from "@/components/comments/CommentList";
import { CommentForm } from "@/components/comments/CommentForm";
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
                <div className="relative w-full overflow-hidden rounded-xl border border-brand-orange-muted/10 shadow-lg bg-card-slate/30 flex items-center justify-center">
                  <img
                    src={block.url}
                    alt={block.alt || "Imagem da matéria"}
                    className="w-full h-auto max-h-[550px] object-cover object-center rounded-xl"
                  />
                </div>
                {block.caption && (
                  <span className="text-xs text-gray-500 font-mono text-center">
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

  return <div className="space-y-4">{parseMarkdownToReact(post.body)}</div>;
}

export function PostArticle({ post, stats }: { post: Post; stats: PostStats }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();

  const { counts, isPending, error: reactionError, toggleReaction, userReaction } = useReactions({
    postId: post.id,
    initial: stats.reactions,
    initialUserReaction: stats.userReaction,
    hydrate: true,
  });

  const { count: viewCount, registerView } = usePostViews({ postId: post.id, initialCount: stats.views });

  useEffect(() => {
    registerView();
  }, [registerView]);

  const { comments, isLoading: commentsLoading, error: commentsError, addComment, fetchComments } = useComments(post.id);

  useEffect(() => {
    queueMicrotask(() => void fetchComments());
  }, [fetchComments]);

  return (
    <div className="min-h-dvh bg-background-void text-white font-mono pb-24">
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors flex items-center gap-2"
          >
            ← Voltar para a Home
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-10 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-200" />
            <span className="text-sm font-mono font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors">
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

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white uppercase leading-tight">
            {post.title}
          </h1>
          <p className="text-base text-gray-400 font-sans border-l-2 border-brand-orange pl-4 py-1 leading-relaxed">
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

        <div className="mt-12 pt-8 border-t border-brand-orange-muted/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
            O que você achou dessa matéria?
          </h3>
          <ReactionBar
            hype={counts.hype}
            flop={counts.flop}
            salty={counts.salty}
            onToggle={toggleReaction}
            activeReaction={userReaction}
            disabled={isPending}
            error={reactionError}
          />
        </div>

        <div className="mt-14 pt-10 border-t border-brand-orange-muted/10">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6">
            Comentários da Comunidade
          </h3>
          <div className="mb-6 bg-card-slate/20 border border-brand-orange-muted/10 rounded-xl p-4">
            <CommentForm onSubmit={(content) => addComment(content)} />
          </div>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <CommentList
              comments={comments}
              isLoading={commentsLoading}
              error={commentsError}
              onRetry={() => void fetchComments()}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
