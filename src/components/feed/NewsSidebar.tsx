"use client";

import Link from "next/link";
import type { Post, PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";

interface NewsSidebarProps {
  posts: Post[];
  stats: Record<string, PostStats>;
}

export function NewsSidebar({ posts, stats }: NewsSidebarProps) {
  const topHypePosts = [...posts]
    .sort((a, b) => {
      const statsA = stats[a.id];
      const statsB = stats[b.id];
      const scoreA = (statsA?.reactions.hype || 0) * 2 + (statsA?.views || 0);
      const scoreB = (statsB?.reactions.hype || 0) * 2 + (statsB?.views || 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  return (
    <aside className="space-y-6">
      <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-brand-orange-muted/10">
          <span className="text-base">🏆</span>
          <h3 className="font-subtitle text-xs font-bold text-white uppercase tracking-wider">
            Mais Hypadas
          </h3>
          <span className="ml-auto text-[9px] font-subtitle text-brand-orange font-bold uppercase tracking-widest bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
            Top 4
          </span>
        </div>

        <div className="space-y-4">
          {topHypePosts.map((post, index) => {
            const postStat = stats[post.id];
            const hypeCount = postStat?.reactions.hype || 0;

            return (
              <Link
                key={post.id}
                href={`/posts/${post.slug}`}
                className="group flex gap-3 items-start p-2 rounded-xl hover:bg-card-slate/60 transition-all duration-200"
              >
                <div className="relative shrink-0 w-7 h-7 rounded-lg bg-background-void border border-brand-orange-muted/20 flex items-center justify-center font-heading font-black text-xs text-brand-orange group-hover:border-brand-orange transition-colors">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag category={post.category} />
                    {hypeCount > 0 && (
                      <span className="text-[10px] font-subtitle text-brand-orange font-bold">
                        🔥 {hypeCount} hype
                      </span>
                    )}
                  </div>
                  <h4 className="font-subtitle text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors">
                    {post.title}
                  </h4>
                </div>

                {post.image_url && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-brand-orange-muted/10">
                    <img
                      src={post.image_url}
                      alt={post.image_alt || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
