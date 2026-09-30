import Link from "next/link";
import { Timer } from "@/components/ui/Timer";

export interface UserReplyItem {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  post_id: string;
  original_post: {
    id: string;
    content: string;
    author_name: string;
    author_username?: string | null;
  } | null;
}

interface ProfileRepliesTabProps {
  replies: UserReplyItem[];
  isLoading: boolean;
}

export function ProfileRepliesTab({ replies, isLoading }: ProfileRepliesTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-sm border border-white/10 bg-[#111217] p-5">
            <div className="h-4 w-1/3 rounded bg-card-slate" />
            <div className="mt-3 h-12 rounded bg-card-slate/50" />
            <div className="mt-3 h-4 w-1/2 rounded bg-card-slate" />
          </div>
        ))}
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
        Nenhuma resposta publicada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <article
          key={reply.id}
          className="rounded-sm border border-white/10 bg-[#111217] p-5 transition-colors hover:border-brand-orange/40"
        >
          {reply.original_post && (
            <div className="mb-4 rounded-sm border-l-2 border-brand-orange bg-[#16171D] p-3 text-xs">
              <span className="font-bold text-gray-400">
                Em resposta a{" "}
                <span className="text-white">
                  @{reply.original_post.author_username || reply.original_post.author_name}
                </span>
                :
              </span>
              <p className="mt-1 line-clamp-2 text-gray-300">
                &ldquo;{reply.original_post.content}&rdquo;
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-bold text-brand-orange">Sua resposta:</span>
            <Timer date={reply.created_at} />
          </div>

          <p className="mt-2 text-sm leading-relaxed text-white">
            {reply.content}
          </p>

          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-xs text-gray-400">
              ❤️ {reply.likes_count} {reply.likes_count === 1 ? "curtida" : "curtidas"}
            </span>

            <Link
              href={`/brickboard?post=${reply.post_id}`}
              className="text-xs font-bold text-brand-orange hover:text-white"
            >
              Ver conversa completa →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
