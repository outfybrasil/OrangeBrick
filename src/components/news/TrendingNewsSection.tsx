import Link from "next/link";
import Image from "next/image";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import type { Post } from "@/lib/types/database";

export interface TrendingItem {
  post: Post;
  score: number;
  hypes: number;
  comments: number;
}

interface TrendingNewsSectionProps {
  items: TrendingItem[];
}

export function TrendingNewsSection({ items }: TrendingNewsSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section aria-labelledby="trending-news-heading" className="my-12">
      <div className="flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
              Em Alta Agora
            </span>
          </div>
          <h2 id="trending-news-heading" className="mt-1 font-heading text-2xl font-black uppercase text-white sm:text-3xl">
            O que mais está repercutindo
          </h2>
        </div>
        <Link
          href="/em-alta"
          className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-brand-orange"
        >
          Ver termômetro completo →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const rank = String(index + 1).padStart(2, "0");
          const postDate = item.post.published_at || item.post.created_at;

          return (
            <article
              key={item.post.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-sm border border-white/10 bg-[#111217] p-4 transition-colors duration-200 hover:border-brand-orange/40"
            >
              <div>
                <div className="relative aspect-video w-full overflow-hidden bg-background-void rounded-sm">
                  {item.post.image_url ? (
                    <Image
                      src={item.post.image_url}
                      alt={item.post.image_alt || item.post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-card-slate text-xs font-bold uppercase tracking-wider text-gray-500">
                      Orange Brick
                    </div>
                  )}
                  <span className="absolute left-2 top-2 font-heading text-2xl font-black text-brand-orange drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {rank}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Tag category={item.post.category} />
                  <span className="text-xs text-gray-500">•</span>
                  <Timer date={postDate} />
                </div>

                <h3 className="mt-2.5 font-heading text-base font-black uppercase leading-snug tracking-tight text-white transition-colors duration-200 group-hover:text-brand-orange line-clamp-2">
                  <Link href={`/posts/${item.post.slug}`} className="focus-visible:outline-none">
                    {item.post.title}
                  </Link>
                </h3>
              </div>

              {(item.hypes > 0 || item.comments > 0) && (
                <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-3 text-xs font-semibold text-gray-400">
                  {item.hypes > 0 && (
                    <span className="inline-flex items-center gap-1 text-brand-orange">
                      <ReactionIcon type="hype" count={item.hypes} size={14} />
                      <span>{item.hypes}</span>
                    </span>
                  )}
                  {item.comments > 0 && (
                    <span className="inline-flex items-center gap-1 text-gray-300">
                      <ReactionIcon type="comment" count={item.comments} size={14} />
                      <span>{item.comments}</span>
                    </span>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
