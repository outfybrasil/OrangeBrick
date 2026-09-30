import Link from "next/link";
import Image from "next/image";
import { Tag } from "@/components/ui/Tag";
import { Timer } from "@/components/ui/Timer";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import type { Post } from "@/lib/types/database";

interface SecondaryNewsCardProps {
  post: Post;
  hypes?: number;
  comments?: number;
}

export function SecondaryNewsCard({ post, hypes = 0, comments = 0 }: SecondaryNewsCardProps) {
  const postDate = post.published_at || post.created_at;

  return (
    <article className="group relative flex flex-col sm:flex-row lg:flex-row gap-4 overflow-hidden rounded-sm border border-white/10 bg-[#111217] p-4 transition-colors duration-200 hover:border-brand-orange/40">
      <Link
        href={`/posts/${post.slug}`}
        className="relative aspect-video w-full shrink-0 overflow-hidden bg-background-void sm:w-44 lg:w-48 focus-visible:outline-2 focus-visible:outline-brand-orange"
        aria-label={`Ler matéria: ${post.title}`}
      >
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.image_alt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 176px, 192px"
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card-slate/60 text-xs font-bold uppercase tracking-wider text-gray-500">
            Orange Brick
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <Tag category={post.category} />
            <span className="text-xs text-gray-500">•</span>
            <Timer date={postDate} />
          </div>

          <h3 className="mt-2 font-heading text-base sm:text-lg font-black uppercase leading-snug tracking-tight text-white transition-colors duration-200 group-hover:text-brand-orange line-clamp-2">
            <Link href={`/posts/${post.slug}`} className="focus-visible:outline-none">
              {post.title}
            </Link>
          </h3>
        </div>

        {(hypes > 0 || comments > 0) && (
          <div className="mt-3 flex items-center gap-3 text-xs font-medium text-gray-400">
            {hypes > 0 && (
              <span className="inline-flex items-center gap-1 text-brand-orange">
                <ReactionIcon type="hype" count={hypes} size={13} />
                <span>{hypes}</span>
              </span>
            )}
            {comments > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-300">
                <ReactionIcon type="comment" count={comments} size={13} />
                <span>{comments}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
