"use client";

import Link from "next/link";
import Image from "next/image";
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
    <aside className="overflow-hidden bg-[#111217] ring-1 ring-white/10">
      {/* MAIS HYPADAS */}
      <section aria-labelledby="most-hyped-title">
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-brand-orange/15 via-brand-orange/[0.04] to-transparent px-4 py-3.5">
          <h3 id="most-hyped-title" className="font-heading text-sm font-black uppercase text-white">
            Mais hypadas
          </h3>
          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-xs font-extrabold uppercase text-brand-orange">Top 4</span>
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
                    className="group grid min-h-20 grid-cols-[28px_minmax(0,1fr)_76px] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="font-heading text-xl font-black tracking-[-0.04em] text-brand-orange">
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Tag category={post.category} />
                      </div>
                      <h4 className="line-clamp-2 text-xs font-bold leading-snug text-gray-200 transition-colors group-hover:text-white">
                        {post.title}
                      </h4>
                      {hypeCount > 0 && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-orange">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          {hypeCount}
                        </p>
                      )}
                    </div>

                    {post.image_url ? (
                      <div className="relative aspect-video w-[76px] overflow-hidden rounded-lg bg-[#08090C] ring-1 ring-white/10">
                        <Image loading="lazy" decoding="async"
                          src={post.image_url}
                          alt={post.image_alt || post.title}
                          fill
                          sizes="76px"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        />
                      </div>
                    ) : (
                      <span className="aspect-video w-[76px] rounded-lg bg-card-slate" aria-hidden="true" />
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
