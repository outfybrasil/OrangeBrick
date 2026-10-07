"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { GameCoverImage } from "@/components/releases/GameCoverImage";
import { createDataClient } from "@/lib/supabase/client";
import type { Game, GameReviewRatingAggregate, ProfileGameReview, ReleaseRadarItem, UserGameTracking } from "@/lib/types/database";

type GameSearchResult = Pick<Game, "id" | "slug" | "name" | "cover_image_url" | "release_date" | "platforms">;

interface ProfileGamesTabProps {
  playingNow?: string | null;
  favoriteGames?: string[];
  guaranteedGames: ReleaseRadarItem[];
  radarGames: ReleaseRadarItem[];
  allRadarItemsMap?: Record<string, ReleaseRadarItem>;
  initialGameReviews: ProfileGameReview[];
  currentUserId: string | null;
  isOwner: boolean;
}

export function ProfileGamesTab({
  playingNow,
  favoriteGames = [],
  guaranteedGames,
  radarGames,
  allRadarItemsMap = {},
  initialGameReviews,
  currentUserId,
  isOwner,
}: ProfileGamesTabProps) {
  const [filter, setFilter] = useState<"all" | "guaranteed" | "radar">("all");
  const supabase = useMemo(() => createDataClient(), []);
  const [gameReviews, setGameReviews] = useState(initialGameReviews);
  const [loadingGameReviews, setLoadingGameReviews] = useState(isOwner && Boolean(currentUserId));
  const [gameReviewsError, setGameReviewsError] = useState<string | null>(null);
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSearchResult | null>(null);
  const [rating, setRating] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [confirmingDeleteGameId, setConfirmingDeleteGameId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [communityScores, setCommunityScores] = useState<Record<string, GameReviewRatingAggregate>>({});
  const [communityScoreError, setCommunityScoreError] = useState(false);
  const visibleGameReviews = isOwner ? gameReviews : initialGameReviews;
  const reviewGameIds = useMemo(
    () => Array.from(new Set(visibleGameReviews.map((review) => review.game_id))),
    [visibleGameReviews]
  );

  useEffect(() => {
    if (!isOwner || !currentUserId) return;

    let isActive = true;

    const loadReviews = async () => {
      try {
        const { data: trackingRows, error: trackingError } = await supabase
          .from("user_game_tracking")
          .select("user_id, game_id, status, rating, review_text, is_public, created_at, updated_at")
          .eq("user_id", currentUserId)
          .eq("status", "joguei")
          .order("updated_at", { ascending: false })
          .limit(48);
        if (trackingError) throw trackingError;

        const rows = (trackingRows || []) as UserGameTracking[];
        const gameIds = rows.map((row) => row.game_id);
        if (gameIds.length === 0) {
          if (isActive) setGameReviews([]);
          return;
        }

        const { data: games, error: gamesError } = await supabase
          .from("games")
          .select("id, slug, name, cover_image_url, release_date, platforms")
          .in("id", gameIds);
        if (gamesError) throw gamesError;

        const gamesById = new Map(((games || []) as GameSearchResult[]).map((game) => [game.id, game]));
        const reviews = rows.flatMap((row): ProfileGameReview[] => {
          const game = gamesById.get(row.game_id);
          return game ? [{ ...row, status: "joguei", game }] : [];
        });
        if (isActive) {
          setGameReviews(reviews);
          setGameReviewsError(null);
        }
      } catch {
        if (isActive) setGameReviewsError("Não foi possível carregar suas avaliações.");
      } finally {
        if (isActive) setLoadingGameReviews(false);
      }
    };

    void loadReviews();
    return () => {
      isActive = false;
    };
  }, [currentUserId, isOwner, supabase]);

  useEffect(() => {
    if (reviewGameIds.length === 0) return;

    let isActive = true;
    const loadCommunityScores = async () => {
      try {
        const { data, error } = await supabase.rpc("get_game_review_stats", { target_game_ids: reviewGameIds });
        if (error) throw error;
        if (!isActive) return;
        setCommunityScores(Object.fromEntries((data || []).map((score) => [score.game_id, score])));
        setCommunityScoreError(false);
      } catch {
        if (isActive) setCommunityScoreError(true);
      }
    };

    void loadCommunityScores();
    return () => {
      isActive = false;
    };
  }, [reviewGameIds, supabase]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!reviewEditorOpen || selectedGame || query.length < 2) return;

    let isActive = true;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      void (async () => {
        try {
          const { data, error } = await supabase
            .from("games")
            .select("id, slug, name, cover_image_url, release_date, platforms")
            .eq("is_active", true)
            .ilike("name", `%${query}%`)
            .order("name", { ascending: true })
            .limit(8);
          if (!isActive) return;
          if (error) throw error;
          setSearchResults((data || []) as GameSearchResult[]);
          setReviewError(null);
        } catch {
          if (!isActive) return;
          setReviewError("Não foi possível buscar jogos no catálogo.");
          setSearchResults([]);
        } finally {
          if (isActive) setSearchLoading(false);
        }
      })();
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [reviewEditorOpen, searchQuery, selectedGame, supabase]);

  const openNewReview = () => {
    setSelectedGame(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearchLoading(false);
    setRating("");
    setReviewText("");
    setIsPublic(true);
    setReviewError(null);
    setNotice(null);
    setConfirmingDeleteGameId(null);
    setReviewEditorOpen(true);
  };

  const selectGame = (game: GameSearchResult) => {
    const existingReview = gameReviews.find((review) => review.game_id === game.id);
    setSelectedGame(game);
    setSearchQuery(game.name);
    setSearchLoading(false);
    setRating(existingReview?.rating === null || existingReview?.rating === undefined ? "" : String(existingReview.rating));
    setReviewText(existingReview?.review_text || "");
    setIsPublic(existingReview?.is_public ?? true);
    setReviewError(null);
    setSearchResults([]);
  };

  const editReview = (review: ProfileGameReview) => {
    selectGame(review.game);
    setReviewError(null);
    setNotice(null);
    setConfirmingDeleteGameId(null);
    setReviewEditorOpen(true);
  };

  const saveReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId || !selectedGame) {
      setReviewError("Entre na sua conta e selecione um jogo para continuar.");
      return;
    }

    const numericRating = Number(rating);
    if (!rating || !Number.isFinite(numericRating) || numericRating < 0 || numericRating > 10 || numericRating * 2 !== Math.trunc(numericRating * 2)) {
      setReviewError("Escolha uma nota entre 0 e 10, em intervalos de 0,5.");
      return;
    }

    setSavingReview(true);
    setReviewError(null);
    setNotice(null);
    const updatedAt = new Date().toISOString();
    const normalizedReview = reviewText.trim() || null;

    try {
      const { error } = await supabase.from("user_game_tracking").upsert({
        user_id: currentUserId,
        game_id: selectedGame.id,
        status: "joguei",
        rating: numericRating,
        review_text: normalizedReview,
        is_public: isPublic,
        updated_at: updatedAt,
      }, { onConflict: "user_id,game_id" });
      if (error) throw error;

      const previousReview = gameReviews.find((review) => review.game_id === selectedGame.id);
      const savedReview: ProfileGameReview = {
        user_id: currentUserId,
        game_id: selectedGame.id,
        status: "joguei",
        rating: numericRating,
        review_text: normalizedReview,
        is_public: isPublic,
        created_at: previousReview?.created_at || updatedAt,
        updated_at: updatedAt,
        game: selectedGame,
      };
      setGameReviews((current) => [savedReview, ...current.filter((review) => review.game_id !== selectedGame.id)]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 48));
      setReviewEditorOpen(false);
      setSelectedGame(null);
      setNotice("Avaliação salva no seu Brick.");
    } catch {
      setReviewError("Não foi possível salvar a avaliação. Tente novamente.");
    } finally {
      setSavingReview(false);
    }
  };

  const deleteReview = async (review: ProfileGameReview) => {
    if (!currentUserId) return;
    setDeletingGameId(review.game_id);
    setReviewError(null);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from("user_game_tracking")
        .delete()
        .eq("user_id", currentUserId)
        .eq("game_id", review.game_id)
        .select("game_id")
        .maybeSingle();
      if (error || !data) throw error || new Error("Avaliação não encontrada.");
      setGameReviews((current) => current.filter((item) => item.game_id !== review.game_id));
      setConfirmingDeleteGameId(null);
      setNotice("Avaliação removida do perfil.");
    } catch {
      setReviewError("Não foi possível remover a avaliação.");
    } finally {
      setDeletingGameId(null);
    }
  };

  const totalVoted = guaranteedGames.length + radarGames.length;
  const hasGames = Boolean(
    isOwner ||
    playingNow ||
    favoriteGames.length > 0 ||
    totalVoted > 0 ||
    visibleGameReviews.length > 0
  );

  const ownerControls = isOwner ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-[#111619] p-4">
      <div>
        <h3 className="font-heading text-sm font-black uppercase text-white">Avaliações da comunidade</h3>
        <p className="mt-1 text-xs text-gray-400">Registre os jogos que você já jogou.</p>
      </div>
      <button
        type="button"
        onClick={openNewReview}
        disabled={!currentUserId || loadingGameReviews}
        className="inline-flex min-h-10 items-center justify-center rounded-sm bg-brand-orange px-4 text-xs font-black uppercase text-white hover:bg-[#ff7526] disabled:cursor-wait disabled:opacity-60"
      >
        Adicionar jogo
      </button>
    </div>
  ) : null;

  const reviewEditor = isOwner && reviewEditorOpen ? (
    <section aria-labelledby="game-review-form-title" className="rounded-sm border border-brand-orange/30 bg-[#111619] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="game-review-form-title" className="font-heading text-base font-black uppercase text-white">Avaliar jogo</h3>
          <p className="mt-1 text-xs text-gray-400">Sua nota é pessoal e não altera a avaliação editorial do Orange Brick.</p>
        </div>
        <button
          type="button"
          onClick={() => { setReviewEditorOpen(false); setReviewError(null); }}
          className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-3 text-xs font-bold text-gray-300 hover:bg-white/5"
        >
          Fechar
        </button>
      </div>

      <form onSubmit={(event) => void saveReview(event)} className="mt-4 space-y-4">
        <div>
          <label htmlFor="game-review-search" className="mb-1.5 block text-xs font-bold text-gray-300">Jogo</label>
          <input
            id="game-review-search"
            type="search"
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value.slice(0, 80)); setSearchResults([]); setSearchLoading(false); setSelectedGame(null); setReviewError(null); }}
            placeholder="Busque no catálogo de jogos"
            autoComplete="off"
            maxLength={80}
            className="h-11 w-full rounded-sm border border-white/15 bg-[#0c0e12] px-3 text-sm text-white outline-none focus:border-brand-orange"
          />
          {searchQuery.trim().length < 2 && !selectedGame && <p className="mt-1.5 text-xs text-gray-500">Digite ao menos 2 caracteres.</p>}
          {searchLoading && <p role="status" className="mt-2 text-xs text-gray-400">Buscando jogos...</p>}
          {!searchLoading && !reviewError && searchQuery.trim().length >= 2 && !selectedGame && searchResults.length === 0 && <p className="mt-2 text-xs text-gray-400">Nenhum jogo encontrado no catálogo.</p>}
          {searchResults.length > 0 && !selectedGame && (
            <ul aria-label="Resultados da busca de jogos" className="mt-2 max-h-64 divide-y divide-white/10 overflow-y-auto rounded-sm border border-white/10">
              {searchResults.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => selectGame(game)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-white hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-brand-orange"
                  >
                    <span className="min-w-0 truncate font-bold">{game.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{game.release_date?.slice(0, 4) || "Catálogo"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedGame && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/20 px-3 py-2">
              <span className="min-w-0 truncate text-sm font-bold text-white">{selectedGame.name}</span>
              <button
                type="button"
                onClick={() => { setSelectedGame(null); setSearchQuery(""); setRating(""); setReviewText(""); }}
                className="min-h-9 shrink-0 px-2 text-xs font-bold text-brand-orange hover:text-white"
              >
                Trocar
              </button>
            </div>
          )}
        </div>

        {selectedGame && (
          <>
            <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div>
                <label htmlFor="game-review-rating" className="mb-1.5 block text-xs font-bold text-gray-300">Sua nota</label>
                <select
                  id="game-review-rating"
                  required
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  className="h-11 w-full rounded-sm border border-white/15 bg-[#0c0e12] px-3 text-sm text-white outline-none focus:border-brand-orange"
                >
                  <option value="">Selecione de 0 a 10</option>
                  {Array.from({ length: 21 }, (_, index) => index / 2).map((score) => (
                    <option key={score} value={String(score)}>{score.toFixed(1).replace(".", ",")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="game-review-text" className="mb-1.5 block text-xs font-bold text-gray-300">Comentário curto (opcional)</label>
                <textarea
                  id="game-review-text"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value.slice(0, 280))}
                  maxLength={280}
                  rows={3}
                  placeholder="O que você achou do jogo?"
                  className="w-full resize-y rounded-sm border border-white/15 bg-[#0c0e12] px-3 py-2 text-sm text-white outline-none focus:border-brand-orange"
                />
                <p className="mt-1 text-right text-[11px] text-gray-500">{reviewText.length}/280</p>
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="size-4 accent-brand-orange" />
              Mostrar esta avaliação no meu perfil público
            </label>
          </>
        )}

        {reviewError && <p role="alert" className="text-sm text-red-300">{reviewError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => { setReviewEditorOpen(false); setReviewError(null); }}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/15 px-4 text-xs font-bold text-gray-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!selectedGame || !rating || savingReview}
            className="inline-flex min-h-10 items-center justify-center rounded-sm bg-brand-orange px-4 text-xs font-black uppercase text-white hover:bg-[#ff7526] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingReview ? "Salvando..." : "Salvar avaliação"}
          </button>
        </div>
      </form>
    </section>
  ) : null;

  const reviewsSection = visibleGameReviews.length > 0 ? (
    <section aria-labelledby="played-games-heading">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
          <h3 id="played-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
            Jogos que já joguei ({visibleGameReviews.length})
          </h3>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visibleGameReviews.map((review) => (
          <article key={review.game_id} className="flex min-w-0 gap-3 rounded-sm border border-white/10 bg-[#111217] p-3">
            <div className="w-28 shrink-0 self-start overflow-hidden rounded-sm bg-black/30 sm:w-32">
              <GameCoverImage src={review.game.cover_image_url} alt={review.game.name} fit="contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 font-heading text-sm font-black uppercase text-white">{review.game.name}</h4>
              <div className="mt-2 grid max-w-sm grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{isOwner ? "Sua nota" : "Nota pessoal"}</p>
                  <p className="mt-0.5 text-sm font-black text-brand-orange" aria-label={review.rating === null ? "Sem nota pessoal" : `Nota pessoal ${review.rating} de 10`}>
                    {review.rating === null ? "—" : `${review.rating.toFixed(1).replace(".", ",").replace(",0", "")}/10`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Média pública</p>
                  <p className="mt-0.5 text-sm font-black text-white" aria-label={communityScores[review.game_id]?.average_rating === null || communityScores[review.game_id]?.average_rating === undefined ? "Sem média pública" : `Média pública ${communityScores[review.game_id]?.average_rating} de 10`}>
                    {communityScoreError ? "Indisponível" : communityScores[review.game_id]?.average_rating === null || communityScores[review.game_id]?.average_rating === undefined ? "—" : `${communityScores[review.game_id]?.average_rating?.toFixed(1).replace(".", ",")}/10`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {communityScoreError ? "" : `${communityScores[review.game_id]?.rating_count || 0} votos públicos`}
                  </p>
                </div>
              </div>
              {review.review_text && <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-300">{review.review_text}</p>}
              {isOwner && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] font-bold uppercase text-gray-500">{review.is_public ? "Pública" : "Só você"}</span>
                  <button type="button" onClick={() => editReview(review)} className="min-h-8 text-xs font-bold text-brand-orange hover:text-white">Editar</button>
                  {confirmingDeleteGameId === review.game_id ? (
                    <span className="flex items-center gap-2 text-xs text-gray-300">
                      Remover?
                      <button type="button" onClick={() => void deleteReview(review)} disabled={deletingGameId === review.game_id} className="min-h-8 font-bold text-red-300 hover:text-white disabled:opacity-50">{deletingGameId === review.game_id ? "Removendo..." : "Confirmar"}</button>
                      <button type="button" onClick={() => setConfirmingDeleteGameId(null)} disabled={deletingGameId === review.game_id} className="min-h-8 font-bold text-gray-400 hover:text-white">Cancelar</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmingDeleteGameId(review.game_id)} className="min-h-8 text-xs font-bold text-gray-400 hover:text-red-300">Remover</button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  ) : null;

  const noticeBlock = notice ? <p role="status" className="text-sm text-emerald-300">{notice}</p> : null;

  if (!hasGames) {
    return (
      <div className="rounded-sm border border-white/10 bg-[#111217] p-8 text-center text-sm text-gray-400">
        {isOwner ? (
          <div className="space-y-3">
            <p>Você ainda não adicionou jogos ao seu perfil.</p>
            <p className="text-xs text-gray-500">
              Acompanhe lançamentos no Radar ou marque jogos como &ldquo;Garanti&rdquo; para exibi-los aqui.
            </p>
            <Link
              href="/lancamentos"
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-brand-orange px-5 text-xs font-black uppercase text-white hover:bg-[#d94f00]"
            >
              Explorar Radar de Lançamentos
            </Link>
          </div>
        ) : (
          <p>Este usuário ainda não adicionou jogos ao perfil.</p>
        )}
      </div>
    );
  }

  const showGuaranteed = (filter === "all" || filter === "guaranteed") && guaranteedGames.length > 0;
  const showRadar = (filter === "all" || filter === "radar") && radarGames.length > 0;

  return (
    <div className="space-y-8">
      {ownerControls}
      {reviewEditor}
      {noticeBlock}
      {gameReviewsError && <p role="alert" className="text-sm text-red-300">{gameReviewsError}</p>}
      {loadingGameReviews && isOwner && <p role="status" className="text-sm text-gray-400">Carregando seus jogos avaliados...</p>}
      {isOwner && !loadingGameReviews && gameReviews.length === 0 && (
        <p className="rounded-sm border border-white/10 bg-[#111217] p-4 text-sm text-gray-400">Você ainda não avaliou jogos no seu Brick.</p>
      )}
      {reviewsSection}
      {/* Sub-filtros quando o usuário tem jogos marcados */}
      {guaranteedGames.length > 0 && radarGames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-9 px-3.5 text-xs font-bold transition-colors rounded-sm ${
              filter === "all"
                ? "bg-brand-orange text-white"
                : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            Todos ({totalVoted})
          </button>
          <button
            type="button"
            onClick={() => setFilter("guaranteed")}
            className={`min-h-9 px-3.5 text-xs font-bold transition-colors rounded-sm ${
              filter === "guaranteed"
                ? "bg-brand-orange text-white"
                : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            Garanti ({guaranteedGames.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("radar")}
            className={`min-h-9 px-3.5 text-xs font-bold transition-colors rounded-sm ${
              filter === "radar"
                ? "bg-brand-orange text-white"
                : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:border-white/20"
            }`}
          >
            No Radar ({radarGames.length})
          </button>
        </div>
      )}

      {playingNow && filter === "all" && (
        <section aria-labelledby="playing-now-heading">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            <h3 id="playing-now-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
              Jogando Agora
            </h3>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-sm border border-brand-orange/40 bg-[#111217] p-4 transition-colors hover:border-brand-orange">
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-sm bg-card-slate sm:w-40">
              <div className="flex h-full w-full items-center justify-center font-heading text-xs font-black uppercase text-brand-orange">
                {playingNow}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-orange">
                Em andamento
              </span>
              <h4 className="mt-1 font-heading text-lg font-black uppercase text-white truncate sm:text-xl">
                {playingNow}
              </h4>
            </div>
          </div>
        </section>
      )}

      {favoriteGames.length > 0 && filter === "all" && (
        <section aria-labelledby="favorite-games-heading">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="text-base" aria-hidden="true">⭐</span>
            <h3 id="favorite-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
              Jogos Favoritos
            </h3>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible">
            {favoriteGames.slice(0, 5).map((gameSlug) => {
              const matchedGame = allRadarItemsMap[gameSlug];
              const title = matchedGame ? matchedGame.game : gameSlug.replace(/-/g, " ");
              return (
                <Link
                  key={gameSlug}
                  href={`/games/${encodeURIComponent(gameSlug)}`}
                  className="group relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-[#16171D] sm:w-full transition-colors hover:border-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
                >
                  {matchedGame?.image_url ? (
                    <GameCoverImage
                      src={matchedGame.image_url}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center font-heading text-xs font-black uppercase text-gray-400 group-hover:text-brand-orange">
                      {title}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                    <p className="truncate text-xs font-black uppercase text-white">
                      {title}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {showGuaranteed && (
        <section id="garanti" aria-labelledby="guaranteed-games-heading">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
              <h3 id="guaranteed-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
                Garanti ({guaranteedGames.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              Coleção deste usuário
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {guaranteedGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="group flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111217] transition-colors hover:border-brand-orange"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-background-void">
                  {game.image_url ? (
                    <GameCoverImage
                      src={game.image_url}
                      alt={game.game}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-card-slate text-xs font-bold text-gray-500">
                      Orange Brick
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-orange uppercase">
                    Garanti
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate font-heading text-sm font-black uppercase text-white group-hover:text-brand-orange">
                    {game.game}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {game.release_label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showRadar && (
        <section id="radar" aria-labelledby="radar-games-heading">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
              <h3 id="radar-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
                No Radar ({radarGames.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              Acompanhando expectativa
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {radarGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="group flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111217] transition-colors hover:border-brand-orange"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-background-void">
                  {game.image_url ? (
                    <GameCoverImage
                      src={game.image_url}
                      alt={game.game}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-card-slate text-xs font-bold text-gray-500">
                      Orange Brick
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gray-300 uppercase">
                    No Radar
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate font-heading text-sm font-black uppercase text-white group-hover:text-brand-orange">
                    {game.game}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {game.release_label}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ação de rodapé caso queira explorar mais lançamentos */}
      {isOwner && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-gray-400">
          <span>Quer adicionar ou acompanhar mais lançamentos na sua lista?</span>
          <Link
            href="/lancamentos"
            className="font-bold text-brand-orange hover:text-white transition-colors uppercase tracking-wider"
          >
            Explorar novos jogos no Radar completo →
          </Link>
        </div>
      )}
    </div>
  );
}
