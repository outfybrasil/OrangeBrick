"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Post, PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";
import { createDataClient } from "@/lib/supabase/client";
import { isAllowedReleaseImageUrl } from "@/lib/release-images";
import type { ReleaseRadarItem } from "@/lib/types/database";

interface NewsSidebarProps {
  posts: Post[];
  stats: Record<string, PostStats>;
}

interface ReleaseItem {
  id: string;
  game: string;
  releaseDate: string;
  platforms: string[];
  image: string;
  badge: string;
  slug?: string;
}

export function NewsSidebar({ posts, stats }: NewsSidebarProps) {
  const supabase = useMemo(() => createDataClient(), []);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);

  useEffect(() => {
    queueMicrotask(async () => {
      const { data, error } = await supabase
        .from("release_radar_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(4);
      if (error || !data) return;
      setReleases(
        (data as ReleaseRadarItem[]).map((item) => ({
          id: item.id,
          game: item.game,
          releaseDate: item.release_label,
          platforms: item.platforms,
          image: item.image_url || "",
          badge: item.badge,
          slug: item.post_slug || undefined,
        }))
      );
    });
  }, [supabase]);

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
                    className="group grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-2.5 px-4 py-3 transition-colors hover:bg-white/[0.025]"
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
                      <span className="aspect-video w-[72px] bg-card-slate" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* RADAR DE LANÇAMENTOS */}
      {releases.length > 0 && (
        <section aria-labelledby="radar-sidebar-title" className="border-t border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 id="radar-sidebar-title" className="font-heading text-sm font-black text-white">
              Radar de lançamentos
            </h3>
            <Link href="/lancamentos" className="text-[10px] font-bold text-brand-orange hover:underline">
              Ver todos →
            </Link>
          </div>

          <ol className="divide-y divide-white/[0.06]">
            {releases.map((item) => {
              const content = (
                <div className="group grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]">
                  <div className="relative aspect-square w-12 overflow-hidden bg-[#08090C]">
                    {isAllowedReleaseImageUrl(item.image) ? (
                      <img
                        src={item.image}
                        alt={item.game}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-card-slate">
                        <span className="text-[8px] text-gray-600">?</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white group-hover:text-brand-orange transition-colors">{item.game}</p>
                    <p className="mt-0.5 text-[10px] text-brand-orange font-semibold">{item.releaseDate}</p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-500">{item.platforms.join(", ")}</p>
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.slug ? (
                    <Link href={`/posts/${item.slug}`}>{content}</Link>
                  ) : (
                    <div>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="border-t border-white/10 px-4 py-3">
            <Link href="/lancamentos" className="text-[11px] font-semibold text-gray-500 hover:text-white transition-colors">
              Ver todos os lançamentos →
            </Link>
          </div>
        </section>
      )}
    </aside>
  );
}
