"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { Icon } from "@/components/ui/Icon";
import type { Post, ReactionType } from "@/lib/types/database";

interface PostWithReactions extends Post {
  reaction_counts: Record<string, number>;
}

const REACTION_ICONS: Record<string, string> = {
  hype: "🔥",
  flop: "📉",
  salty: "🧂",
  defendo: "🛡️",
  brick: "🧱",
};

export default function BrickboardPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<PostWithReactions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Brickboard — Orange Brick";

    async function fetchPosts() {
      try {
        const { data: postData, error: postErr } = await supabase
          .from("posts")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false });

        if (postErr) throw postErr;

        const { data: reactionData, error: reactErr } = await supabase
          .from("reactions")
          .select("post_id, reaction_type");

        if (reactErr) throw reactErr;

        if (!postData) {
          setPosts([]);
          setIsLoading(false);
          return;
        }

        const reactionMap: Record<string, Record<string, number>> = {};
        if (reactionData) {
          const rows = reactionData as { post_id: string; reaction_type: string }[];
          for (const r of rows) {
            if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {};
            reactionMap[r.post_id][r.reaction_type] =
              (reactionMap[r.post_id][r.reaction_type] || 0) + 1;
          }
        }

        const enriched = (postData as Post[]).map((p) => ({
          ...p,
          reaction_counts: reactionMap[p.id] || {},
        }));

        enriched.sort(
          (a, b) =>
            (b.reaction_counts.hype || 0) - (a.reaction_counts.hype || 0)
        );

        setPosts(enriched);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar o Brickboard");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-background-void/90 backdrop-blur-md border-b border-brand-orange-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              className="h-10 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-300"
            />
            <span className="text-lg font-mono font-bold text-white group-hover:text-brand-orange transition-colors">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-500">
              Ordenado por <span className="text-brand-orange font-bold">Hype</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1.5 h-8 bg-brand-orange rounded-full" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-white uppercase tracking-wider">
              Brickboard
            </h1>
            <p className="text-xs font-mono text-brand-orange-muted mt-0.5">
              Posts ranqueados por hype — do mais hypado ao mais irrelevante
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="py-20 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && error && (
          <div className="py-20 text-center">
            <Icon name="brick" size={40} className="text-red-400/30 mx-auto mb-4" />
            <p className="text-sm font-mono text-red-400 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-mono text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="py-20 text-center">
            <Icon name="brick" size={40} className="text-brand-orange-muted opacity-30 mx-auto mb-4" />
            <p className="text-sm font-mono text-gray-400">Nenhum post publicado ainda.</p>
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="brickboard-grid">
            {posts.map((post) => {
              const hype = post.reaction_counts.hype || 0;
              const baseSpan = 22;
              const hypeSpan = Math.min(hype, 15);
              const rowSpan = baseSpan + hypeSpan;

              return (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  style={{ gridRowEnd: `span ${rowSpan}` }}
                  className={`
                    group
                    bg-card-slate/85 border border-brand-orange-muted/10
                    rounded-xl overflow-hidden
                    transition-all duration-300 ease-out
                    hover:-translate-y-1 hover:border-brand-orange/30
                    hover:shadow-[0_0_20px_rgba(255,94,0,0.08)]
                  `}
                >
                  {post.image_url && (
                    <div className="relative aspect-video w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.image_url}
                        alt={post.image_alt || ""}
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card-slate via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Tag category={post.category} />
                      <Timer date={post.published_at ?? ""} />
                    </div>

                    <h2 className="font-mono text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors duration-200">
                      {post.title}
                    </h2>

                    <p className="text-xs text-gray-400 font-sans line-clamp-2">
                      {post.summary}
                    </p>

                    <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-gray-500 border-t border-brand-orange-muted/10">
                      {Object.entries(REACTION_ICONS).map(([type, icon]) => {
                        const count = post.reaction_counts[type] || 0;
                        if (count === 0) return null;
                        return (
                          <span key={type} className="flex items-center gap-0.5">
                            <span>{icon}</span>
                            <span className="tabular-nums">{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
