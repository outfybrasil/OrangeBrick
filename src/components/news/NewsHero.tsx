import Link from "next/link";
import Image from "next/image";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import type { Post } from "@/lib/types/database";

interface NewsHeroProps {
  post: Post;
  hypes?: number;
  comments?: number;
}

export function NewsHero({ post, hypes = 0, comments = 0 }: NewsHeroProps) {
  const postDate = post.published_at || post.created_at;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111217] transition-colors duration-200 hover:border-brand-orange/40">
      <Link
        href={`/posts/${post.slug}`}
        className="relative aspect-video w-full overflow-hidden bg-background-void focus-visible:outline-2 focus-visible:outline-brand-orange"
        aria-label={`Ler matéria principal: ${post.title}`}
      >
        {post.image_url ? (
          <>
            <Image
              src={post.image_url}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="scale-105 object-cover opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
            />
            <Image
              src={post.image_url}
              alt={post.image_alt || post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 65vw"
              className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card-slate/80 p-6 text-center">
            <span className="font-heading text-lg font-black uppercase tracking-wider text-brand-orange">
              Orange Brick Editorial
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111217] via-[#111217]/30 to-transparent opacity-90 lg:hidden" />
      </Link>

      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 lg:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Tag category={post.category} />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange">Destaque</span>
            <span className="text-xs text-gray-500">•</span>
            <Timer date={postDate} />
          </div>

          <h2 className="mt-4 font-heading text-2xl font-black uppercase leading-[1.12] tracking-tight text-white transition-colors duration-200 group-hover:text-brand-orange sm:text-3xl lg:text-4xl">
            <Link href={`/posts/${post.slug}`} className="focus-visible:outline-none">
              {post.title}
            </Link>
          </h2>

          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-300 sm:text-base sm:line-clamp-3">
            {post.summary}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
            {hypes > 0 && (
              <span className="inline-flex items-center gap-1.5 text-brand-orange">
                <ReactionIcon type="hype" count={hypes} size={15} />
                <span>{hypes}</span>
              </span>
            )}
            {comments > 0 && (
              <span className="inline-flex items-center gap-1.5 text-gray-300">
                <ReactionIcon type="comment" count={comments} size={15} />
                <span>{comments}</span>
              </span>
            )}
            {post.author_name && (
              <span className="text-gray-400">
                Por <span className="text-white">{post.author_name}</span>
              </span>
            )}
          </div>

          <Link
            href={`/posts/${post.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-orange transition-colors hover:text-white"
          >
            <span>Ler matéria</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
