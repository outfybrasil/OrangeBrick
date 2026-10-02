"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/ui/Footer";
import { GameCoverImage } from "@/components/releases/GameCoverImage";
import { AuthModal } from "@/components/auth/AuthModal";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { BrickCard } from "@/components/community/BrickCard";
import { getGoogleAvatarUrl } from "@/lib/avatar";
import { getCommunityErrorMessage } from "@/lib/community-errors";
import type { ReleaseRadarItem, ReleaseHypeVote, CommunityCommentRow } from "@/lib/types/database";
import type { CommunityPost, CommunityComment } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";

type HypeVoteType = ReleaseHypeVote["vote_type"];

export interface GamePageClientProps {
  game: ReleaseRadarItem;
  initialCounts: { buy: number; watch: number; skip: number };
  initialCountsError?: boolean;
  initialUserVote?: HypeVoteType | null;
  initialVoteUserId?: string | null;
  relatedPosts: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string;
    image_url: string | null;
    category: string;
    published_at: string | null;
  }>;
  relatedBricks: CommunityPost[];
  relatedBricksError?: boolean;
}

const HYPE_OPTIONS: { type: HypeVoteType; label: string; shortLabel: string; emoji: string }[] = [
  { type: "buy", label: "Já garanti", shortLabel: "Garanti", emoji: "🎮" },
  { type: "watch", label: "No meu radar", shortLabel: "Radar", emoji: "👀" },
  { type: "skip", label: "Passo reto", shortLabel: "Passo", emoji: "⏭️" },
];

export function GamePageClient({
  game,
  initialCounts,
  initialCountsError = false,
  initialUserVote = null,
  initialVoteUserId = null,
  relatedPosts,
  relatedBricks,
  relatedBricksError = false,
}: GamePageClientProps) {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [counts, setCounts] = useState(initialCounts);
  const [userVote, setUserVote] = useState<HypeVoteType | null>(initialUserVote);
  const [voteOwnerId, setVoteOwnerId] = useState(initialVoteUserId);
  const [isVoting, setIsVoting] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<HypeVoteType | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [bricks, setBricks] = useState(relatedBricks);
  const reactionPendingRef = useRef(new Set<string>());

  const totalVotes = counts.buy + counts.watch + counts.skip;
  const hypePercent = totalVotes === 0 ? 0 : Math.round(((counts.buy + counts.watch) / totalVotes) * 100);

  const commitVote = useCallback(
    async (vote: HypeVoteType) => {
      if (initialCountsError || isAuthLoading) return;
      if (!user) {
        setPendingVote(vote);
        setIsAuthModalOpen(true);
        return;
      }
      if (isVoting) return;

      setIsVoting(true);
      setStatusNotice(null);
      let voteSaved = false;

      try {
        const { data: currentVotes, error: currentVoteError } = await supabase.rpc("get_my_release_hype_votes").eq("release_id", game.id);
        if (currentVoteError) throw currentVoteError;
        const previousVote = ((currentVotes || []) as Array<{ release_id: string; vote_type: HypeVoteType }>)[0]?.vote_type || null;
        setVoteOwnerId(user.id);
        setUserVote(previousVote);
        const nextVote = previousVote === vote ? null : vote;

        try {
          const res = await fetch("/api/release-hype-vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ releaseId: game.id, vote: nextVote }),
          });

          if (res.ok) {
            const payload = (await res.json()) as { counts?: Record<HypeVoteType, number> };
            voteSaved = true;
            setUserVote(nextVote);
            if (payload.counts) {
              setCounts(payload.counts);
            }
          } else {
            await supabase
              .from("release_hype_votes")
              .delete()
              .eq("release_id", game.id)
              .eq("user_id", user.id);

            if (nextVote) {
              const { error: insError } = await supabase.from("release_hype_votes").insert({
                release_id: game.id,
                user_id: user.id,
                vote_type: nextVote,
              });
              if (insError) throw insError;
            }
            voteSaved = true;
            setUserVote(nextVote);
            const { data: refreshedCounts } = await supabase.rpc("get_release_hype_counts");
            const currentCounts = { buy: 0, watch: 0, skip: 0 };
            for (const row of (refreshedCounts || []) as Array<{ release_id: string; vote_type: HypeVoteType; vote_count: number }>) {
              if (row.release_id === game.id) {
                currentCounts[row.vote_type] = Number(row.vote_count);
              }
            }
            setCounts(currentCounts);
          }
        } catch (innerErr) {
          throw innerErr;
        }
        if (previousVote !== vote) {
          setStatusNotice(vote === "buy" ? "Adicionado aos seus jogos garantidos no Meu Brick!" : vote === "watch" ? "Adicionado ao seu radar no Meu Brick!" : "Voto registrado com sucesso!");
          setTimeout(() => setStatusNotice(null), 4000);
        }
      } catch {
        setStatusNotice(voteSaved ? "Voto salvo, mas o termômetro não foi atualizado. Recarregue a página." : "Erro ao salvar voto. Tente novamente.");
      } finally {
        setIsVoting(false);
      }
    },
    [game.id, initialCountsError, isAuthLoading, isVoting, supabase, user]
  );

  const handleBrickReaction = async (postId: string, type: ReactionType) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return false;
    }
    if (reactionPendingRef.current.has(postId)) return false;
    reactionPendingRef.current.add(postId);

    try {
      const { data: existing, error: lookupError } = await supabase
        .from("community_reactions")
        .select("id,reaction_type")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (lookupError) return false;

      const previousReaction = (existing as { id: string; reaction_type: ReactionType } | null)?.reaction_type || null;
      const nextReaction = previousReaction === type ? null : type;
      if (nextReaction === null) {
        const { error } = await supabase.from("community_reactions").delete().eq("id", (existing as { id: string }).id);
        if (error) return false;
      } else {
        const { error } = await supabase.from("community_reactions").upsert(
          { post_id: postId, user_id: user.id, reaction_type: nextReaction },
          { onConflict: "post_id,user_id" }
        );
        if (error) return false;
      }

      setBricks((current) => current.map((post) => {
        if (post.id !== postId) return post;
        const reactions = { ...post.reactions };
        if (previousReaction) reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1);
        if (nextReaction) reactions[nextReaction] = (reactions[nextReaction] || 0) + 1;
        return { ...post, reactions, user_reaction: nextReaction };
      }));
      return true;
    } catch {
      return false;
    } finally {
      reactionPendingRef.current.delete(postId);
    }
  };

  const shareBrick = async (originalPost: CommunityPost, comment: string) => {
    if (!user) throw new Error("Entre na sua conta para republicar um Brick.");
    const { data, error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      author_name: profile?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Leitor Orange Brick",
      author_username: profile?.username || null,
      author_avatar: profile?.avatar_url || getGoogleAvatarUrl(user) || "",
      content: comment,
      attached_article: {
        _type: "shared_post",
        original_post_id: originalPost.id,
        original_author_name: originalPost.author_name,
        original_author_username: originalPost.author_username,
        original_author_avatar: originalPost.author_avatar,
        original_content: originalPost.content,
        original_created_at: originalPost.created_at,
        original_platform_tag: originalPost.platform_tag || undefined,
        original_attached_article: originalPost.attached_article || undefined,
      },
      topic_id: originalPost.topic_id || null,
    }).select("id").single();
    if (error) throw new Error(getCommunityErrorMessage(error));
    router.push(`/brickboard?post=${encodeURIComponent((data as { id: string }).id)}`);
  };

  const getBrickComments = async (postId: string): Promise<CommunityComment[]> => {
    const { data, error } = await supabase
      .from("community_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(getCommunityErrorMessage(error));

    const comments = (data || []) as CommunityCommentRow[];
    if (comments.length === 0) return [];

    const { data: likes, error: likesError } = await supabase
      .from("community_comment_likes")
      .select("comment_id,user_id")
      .in("comment_id", comments.map((comment) => comment.id));
    if (likesError) throw new Error(getCommunityErrorMessage(likesError));

    const likesByComment = new Map<string, number>();
    const likedByUser = new Set<string>();
    for (const like of (likes || []) as Array<{ comment_id: string; user_id: string }>) {
      likesByComment.set(like.comment_id, (likesByComment.get(like.comment_id) || 0) + 1);
      if (like.user_id === user?.id) likedByUser.add(like.comment_id);
    }

    return comments.map((comment) => ({
      ...comment,
      author_avatar: comment.author_avatar || "/icons/default-avatar.png",
      likes_count: likesByComment.get(comment.id) || 0,
      user_has_liked: likedByUser.has(comment.id),
    }));
  };

  const addBrickComment = async (postId: string, content: string, parentId?: string) => {
    if (!user) throw new Error("Entre na sua conta para responder no Brickboard.");
    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      parent_id: parentId || null,
      user_id: user.id,
      author_name: profile?.nickname || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Leitor Orange Brick",
      author_username: profile?.username || null,
      author_avatar: profile?.avatar_url || getGoogleAvatarUrl(user) || "",
      content,
    });
    if (error) throw new Error(getCommunityErrorMessage(error));
  };

  const deleteBrickComment = async (commentId: string) => {
    if (!user) throw new Error("Entre na sua conta para apagar uma resposta.");
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId).eq("user_id", user.id);
    if (error) throw new Error(getCommunityErrorMessage(error));
  };

  const toggleBrickCommentLike = async (commentId: string) => {
    if (!user) throw new Error("Entre na sua conta para curtir uma resposta.");
    const { data, error: lookupError } = await supabase
      .from("community_comment_likes")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (lookupError) throw new Error(getCommunityErrorMessage(lookupError));

    const { error } = data
      ? await supabase.from("community_comment_likes").delete().eq("id", (data as { id: string }).id)
      : await supabase.from("community_comment_likes").insert({ comment_id: commentId, user_id: user.id });
    if (error) throw new Error(getCommunityErrorMessage(error));
  };

  return (
    <>
      <SiteHeader variant="full" />

      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <nav aria-label="Navegação estrutural" className="mb-4 text-xs font-bold text-gray-400">
          <ol className="flex items-center gap-2 flex-wrap">
            <li>
              <Link href="/" className="hover:text-brand-orange transition-colors">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/lancamentos" className="hover:text-brand-orange transition-colors">
                Lançamentos
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              {game.game}
            </li>
          </ol>
        </nav>

        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10 border-b border-white/10 pb-8">
          <div>
            <GameCoverImage src={game.image_url} alt={game.game} priority className="rounded-xl" />
          </div>

          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="rounded bg-brand-orange/20 px-2 py-0.5 text-xs font-black uppercase text-brand-orange tracking-wider">
                  {game.badge || "Lançamento"}
                </span>
                {game.is_indie && (
                  <span className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-semibold text-gray-300">
                    Indie
                  </span>
                )}
                {game.product_type === "dlc" && (
                  <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    Expansão / DLC
                  </span>
                )}
              </div>

              <h1 className="font-heading text-2xl sm:text-4xl font-black uppercase tracking-tight text-white mb-3">
                {game.game}
              </h1>

              <div className="space-y-2.5 text-xs sm:text-sm text-gray-300 border-y border-white/10 py-3.5 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Data de lançamento:</span>
                  <strong className="text-white font-bold">{game.release_label}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Plataformas:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {game.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-xs font-bold text-gray-200"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#12141A] p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-brand-orange">
                  Termômetro da Comunidade
                </span>
                <span className="text-xs font-bold text-gray-300 tabular-nums">
                  {initialCountsError ? "Indisponível" : totalVotes === 0 ? "Seja o primeiro a votar" : `${hypePercent}% no hype (${totalVotes} votos)`}
                </span>
              </div>

              <div className="mb-3 flex h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
                {totalVotes > 0 && (
                  <>
                    <span className="bg-brand-orange transition-all" style={{ width: `${(counts.buy / totalVotes) * 100}%` }} />
                    <span className="bg-[#F4A261] transition-all" style={{ width: `${(counts.watch / totalVotes) * 100}%` }} />
                    <span className="bg-gray-600 transition-all" style={{ width: `${(counts.skip / totalVotes) * 100}%` }} />
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {HYPE_OPTIONS.map((option) => {
                  const isSelected = voteOwnerId === user?.id && userVote === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => void commitVote(option.type)}
                      disabled={isVoting || isAuthLoading || initialCountsError}
                      aria-pressed={isSelected}
                      className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 py-1 text-xs font-extrabold uppercase transition-all cursor-pointer ${
                        isSelected
                          ? "border-brand-orange bg-brand-orange text-white shadow-[0_0_12px_rgba(255,94,0,0.3)]"
                          : "border-white/10 bg-white/[0.025] text-gray-300 hover:border-brand-orange/40 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <span>{option.emoji}</span>
                        <span>{option.shortLabel}</span>
                      </span>
                      <span className={`text-[11px] tabular-nums mt-0.5 ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                        {counts[option.type]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {initialCountsError && <p role="alert" className="mt-2.5 text-center text-xs text-red-300">Não foi possível carregar o termômetro. Recarregue a página para tentar novamente.</p>}

              {statusNotice && (
                <p role="status" className="mt-2.5 text-center text-xs font-bold text-brand-orange animate-fade-in">
                  {statusNotice}
                </p>
              )}
            </div>
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="mt-8 border-b border-white/10 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-black uppercase text-white">
                Notícias sobre {game.game}
              </h2>
              <Link href={`/noticias?q=${encodeURIComponent(game.game)}`} className="text-xs font-bold text-brand-orange hover:underline">
                Ver todas ↗
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0E1015] p-3 transition-colors hover:border-brand-orange/40 hover:bg-[#13161F]"
                >
                  {post.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg mb-2.5 bg-black/60">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-1">
                    {post.category}
                  </span>
                  <h3 className="font-heading text-sm font-bold uppercase text-white group-hover:text-brand-orange transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                    {post.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                BrickBoard
              </p>
              <h2 className="font-heading text-lg font-black uppercase text-white">
                Conversas sobre {game.game}
              </h2>
            </div>

            <Link
              href={`/brickboard?search=${encodeURIComponent(game.game)}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-brand-orange bg-brand-orange/15 px-4 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            >
              Publicar sobre {game.game}
            </Link>
          </div>

          {relatedBricksError ? (
            <div role="alert" className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-gray-300">
              Não foi possível carregar as conversas. Recarregue a página para tentar novamente.
            </div>
          ) : bricks.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-gray-300 mb-3">
                Ainda não há publicações sobre este jogo no BrickBoard.
              </p>
              <Link
                href={`/brickboard?search=${encodeURIComponent(game.game)}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-orange px-5 text-xs font-black uppercase text-white transition-colors hover:bg-brand-orange/90"
              >
                Seja o primeiro a abrir uma conversa
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bricks.map((brick) => (
                <BrickCard
                  key={brick.id}
                  post={brick}
                  onReaction={handleBrickReaction}
                  onSharePost={shareBrick}
                  onAddComment={addBrickComment}
                  onDeleteComment={deleteBrickComment}
                  onToggleCommentLike={toggleBrickCommentLike}
                  getComments={getBrickComments}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingVote(null);
        }}
        onSuccess={() => {
          if (pendingVote) {
            void commitVote(pendingVote);
            setPendingVote(null);
          }
        }}
      />
    </>
  );
}
