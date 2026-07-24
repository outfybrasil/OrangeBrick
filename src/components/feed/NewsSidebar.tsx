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
    <aside>
      <section aria-labelledby="most-hyped-title" className="border-y border-white/10">
        <div className="flex items-end justify-between gap-3 border-b border-white/10 py-4">
          <div>
            <h3 id="most-hyped-title" className="font-heading text-xl font-black tracking-[-0.025em] text-white">
              Mais hypadas
            </h3>
            <p className="mt-1 text-[11px] text-gray-500">Ranking por leitura e reações</p>
          </div>
          <span className="pb-0.5 text-[10px] font-bold uppercase text-gray-600">Top 4</span>
        </div>

        {topHypePosts.length === 0 ? (
          <p className="py-8 text-sm leading-6 text-gray-500">O ranking aparece assim que as matérias recebem leituras e reações.</p>
        ) : (
          <ol className="divide-y divide-white/[0.08]">
          {topHypePosts.map((post, index) => {
            const postStat = stats[post.id];
            const hypeCount = postStat?.reactions.hype || 0;

            return (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group grid grid-cols-[32px_minmax(0,1fr)_80px] items-center gap-3 py-4 transition-colors hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange"
                >
                  <span className="font-heading text-2xl font-black tracking-[-0.04em] text-gray-600 transition-colors group-hover:text-brand-orange">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Tag category={post.category} />
                      {hypeCount > 0 && (
                        <span className="text-[10px] font-bold text-brand-orange">
                          {hypeCount} {hypeCount === 1 ? "hype" : "hypes"}
                        </span>
                      )}
                    </div>
                    <h4 className="line-clamp-2 text-xs font-bold leading-snug text-gray-200 transition-colors group-hover:text-white">
                      {post.title}
                    </h4>
                  </div>

                  {post.image_url ? (
                    <div className="relative aspect-video w-20 overflow-hidden rounded-md bg-[#08090C]">
                      <img
                        src={post.image_url}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-sm"
                      />
                      <img
                        src={post.image_url}
                        alt={post.image_alt || ""}
                        className="relative h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <span className="aspect-video w-20 rounded-md bg-card-slate" aria-hidden="true" />
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
