"use client";

import Link from "next/link";
import type { Post, PostStats } from "@/lib/types/database";
import { Tag } from "@/components/ui/Tag";

interface NewsSidebarProps {
  posts: Post[];
  stats: Record<string, PostStats>;
}

const UPCOMING_RELEASES = [
  { game: "Halo: Campaign Evolved", date: "28 de Julho", badge: "Faltam 5 dias", color: "text-brand-orange border-brand-orange/30 bg-brand-orange/10" },
  { game: "Wreckreation 2", date: "Agosto 2026", badge: "Confirmado", color: "text-accent-blue border-accent-blue/30 bg-accent-blue/10" },
  { game: "Marvel's Wolverine", date: "15 de Setembro", badge: "Em Breve", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  { game: "Gears of War: E-Day", date: "06 de Outubro", badge: "Em Breve", color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
];

export function NewsSidebar({ posts, stats }: NewsSidebarProps) {
  // Sort posts by total hype reactions or views for ranking
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
      {/* 🏆 AS MAIS HYPEADAS */}
      <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-brand-orange-muted/10">
          <span className="text-base">🏆</span>
          <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Mais Hypeadas
          </h3>
          <span className="ml-auto text-[9px] font-mono text-brand-orange font-bold uppercase tracking-widest bg-brand-orange/10 px-2 py-0.5 rounded">
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
                <div className="relative shrink-0 w-7 h-7 rounded-lg bg-background-void border border-brand-orange-muted/20 flex items-center justify-center font-mono font-black text-xs text-brand-orange group-hover:border-brand-orange transition-colors">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag category={post.category} />
                    {hypeCount > 0 && (
                      <span className="text-[10px] font-mono text-brand-orange font-bold">
                        🔥 {hypeCount} hype
                      </span>
                    )}
                  </div>
                  <h4 className="font-mono text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors">
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

      {/* 🎮 RADAR DE LANÇAMENTOS */}
      <div className="bg-card-slate/40 border border-brand-orange-muted/15 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-brand-orange-muted/10">
          <span className="text-base">🎮</span>
          <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Radar de Lançamentos
          </h3>
        </div>

        <div className="space-y-3">
          {UPCOMING_RELEASES.map((item) => (
            <div
              key={item.game}
              className="flex items-center justify-between p-3 rounded-xl bg-background-void/60 border border-brand-orange-muted/10 hover:border-brand-orange-muted/30 transition-all"
            >
              <div>
                <div className="font-mono text-xs font-bold text-white leading-tight">
                  {item.game}
                </div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                  {item.date}
                </div>
              </div>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.color}`}>
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🧱 COMUNIDADE BRICKBOARD WIDGET */}
      <div className="bg-gradient-to-br from-brand-orange/10 via-card-slate/50 to-background-void border border-brand-orange/30 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-2xl mb-2">🧱</div>
        <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
          Comunidade Orange Brick
        </h4>
        <p className="text-xs text-gray-400 font-sans mt-1.5 leading-relaxed">
          Dê sua opinião sobre as notícias, reaja aos posts e participe dos debates no Brickboard.
        </p>

        <Link
          href="/brickboard"
          className="inline-block mt-4 w-full py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
        >
          Ir para o Brickboard
        </Link>
      </div>
    </aside>
  );
}
