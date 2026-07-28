"use client";

import Link from "next/link";
import type { Post, PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";

interface NewsSidebarProps {
  posts: Post[];
  stats: Record<string, PostStats>;
}

export function NewsSidebar({ posts, stats }: NewsSidebarProps) {
  const topHypePosts = [...posts.slice(3)]
    .sort((a, b) => {
      const statsA = stats[a.id];
      const statsB = stats[b.id];
      const scoreA = (statsA?.reactions.hype || 0) * 2 + (statsA?.views || 0);
      const scoreB = (statsB?.reactions.hype || 0) * 2 + (statsB?.views || 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  return (
    <aside className="space-y-0 border border-white/10">
      {/* MAIS HYPADAS */}
      <section aria-labelledby="most-hyped-title">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 id="most-hyped-title" className="font-heading text-sm font-black text-white">
            Mais hypadas
          </h3>
          <span className="text-[10px] font-bold uppercase text-gray-600">Top 4</span>
        </div>

        {topHypePosts.length === 0 ? (
          <p className="px-4 py-6 text-xs leading-6 text-gray-500">O ranking aparece assim que as matérias recebem leituras e reações.</p>
        ) : (
          <ol className="divide-y divide-white/[0.06]">
            {topHypePosts.map((post, index) => {
              const postStat = stats[post.id];
              const hypeCount = postStat?.reactions.hype || 0;

              return (
                <li key={post.id}>
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group grid min-h-20 grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                  >
                    <span className="font-heading text-xl font-black tracking-[-0.04em] text-brand-orange">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Tag category={post.category} />
                      </div>
                      <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-200 transition-colors group-hover:text-white">
                        {post.title}
                      </h4>
                      {hypeCount > 0 && (
                        <p className="mt-1 text-[10px] text-brand-orange">🔥 {hypeCount}</p>
                      )}
                    </div>

                    {post.image_url ? (
                      <div className="relative aspect-video w-[72px] overflow-hidden bg-[#08090C]">
                        <img
                          src={post.image_url}
                          alt={post.image_alt || ""}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <span className="aspect-video w-[72px] bg-card-slate" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </aside>
  );
}
