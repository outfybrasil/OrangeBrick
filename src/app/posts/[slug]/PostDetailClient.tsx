"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseMarkdownToReact } from "@/lib/markdown";
import { ReactionBar } from "@/components/reactions/ReactionBar";
import { CommentList } from "@/components/comments/CommentList";
import { CommentForm } from "@/components/comments/CommentForm";
import { useReactions } from "@/lib/hooks/useReactions";
import { useComments } from "@/lib/hooks/useComments";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { Footer } from "@/components/ui/Footer";
import type { Post, ReactionType } from "@/lib/types/database";

const EMPTY_REACTIONS: Record<ReactionType, number> = {
  hype: 0,
  flop: 0,
  salty: 0,
  defendo: 0,
  brick: 0,
};

function PostContent({ post }: { post: Post }) {
  const [isModular, setIsModular] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(post.body);
      if (Array.isArray(parsed)) {
        setIsModular(true);
        setBlocks(parsed);
      }
    } catch {
      setIsModular(false);
    }
  }, [post.body]);

  if (isModular) {
    return (
      <div className="space-y-6">
        {blocks.map((block) => {
          if (block.type === "text") {
            return <div key={block.id}>{parseMarkdownToReact(block.content)}</div>;
          }
          if (block.type === "image") {
            return (
              <div key={block.id} className="my-8 flex flex-col gap-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-brand-orange-muted/10 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.url}
                    alt={block.alt || "Imagem da matéria"}
                    className="w-full h-full object-cover"
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

export function PostArticle({ slug }: { slug: string }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = createClient();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("posts")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();

        if (fetchError) throw fetchError;
        setPost(data as Post);
      } catch (err: any) {
        setError(err.message || "Não foi possível carregar a notícia");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPost();
  }, [slug, supabase]);

  const { counts, isPending, error: reactionError, toggleReaction } = useReactions({
    postId: post?.id || "",
    initial: EMPTY_REACTIONS,
  });

  const { addComment } = useComments(post?.id || "");

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-void text-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-gray-400">Carregando notícia...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background-void text-center p-4 font-mono">
        <p className="text-red-400 mb-4">{error || "Notícia não encontrada"}</p>
        <button
          onClick={() => router.push("/")}
          className="text-xs text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors"
        >
          ← Voltar para a Home
        </button>
      </div>
    );
  }

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
          </div>

          {post.image_url && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-brand-orange-muted/15 shadow-xl my-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt={post.image_alt || post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

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
            defendo={counts.defendo}
            brick={counts.brick}
            category={post?.category}
            onToggle={toggleReaction}
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
            <CommentList postId={post.id} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
