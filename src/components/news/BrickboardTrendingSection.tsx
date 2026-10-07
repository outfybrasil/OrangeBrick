import Link from "next/link";
import Image from "next/image";
import { Timer } from "@/components/ui/Timer";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import { resolveAvatarUrl } from "@/lib/avatar";

export interface BrickTrendingItem {
  id: string;
  author_name: string;
  author_handle?: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
  hypes: number;
  comments: number;
}

interface BrickboardTrendingSectionProps {
  bricks: BrickTrendingItem[];
}

export function BrickboardTrendingSection({ bricks }: BrickboardTrendingSectionProps) {
  if (!bricks || bricks.length === 0) return null;

  return (
    <section aria-labelledby="brickboard-trending-heading" className="my-12">
      <div className="flex items-end justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
              Comunidade
            </span>
          </div>
          <h2 id="brickboard-trending-heading" className="mt-1 font-heading text-2xl font-black uppercase text-white sm:text-3xl">
            Em Alta no BrickBoard
          </h2>
        </div>
        <Link
          href="/brickboard"
          className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-brand-orange"
        >
          Explorar feed comunitário →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bricks.map((brick) => {
          const handle = brick.author_handle || brick.author_name.toLowerCase().replace(/\s+/g, "");
          return (
            <article
              key={brick.id}
              className="flex flex-col justify-between rounded-sm border border-white/10 bg-[#111217] p-5 transition-colors duration-200 hover:border-brand-orange/40"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-card-slate">
                    {brick.author_avatar ? (
                      <Image
                        src={resolveAvatarUrl(brick.author_avatar, brick.author_name)}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-heading text-xs font-black text-brand-orange">
                        {brick.author_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {brick.author_name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      @{handle}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Timer date={brick.created_at} />
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-gray-300">
                  &ldquo;{brick.content}&rdquo;
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
                  {brick.hypes > 0 && (
                    <span className="inline-flex items-center gap-1 text-brand-orange">
                      <ReactionIcon type="hype" count={brick.hypes} size={14} />
                      <span>{brick.hypes}</span>
                    </span>
                  )}
                  {brick.comments > 0 && (
                    <span className="inline-flex items-center gap-1 text-gray-300">
                      <ReactionIcon type="comment" count={brick.comments} size={14} />
                      <span>{brick.comments}</span>
                    </span>
                  )}
                </div>

                <Link
                  href={`/brickboard?post=${brick.id}`}
                  className="text-xs font-black uppercase tracking-wider text-brand-orange transition-colors hover:text-white"
                >
                  Participar da discussão →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
