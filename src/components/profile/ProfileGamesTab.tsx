import Link from "next/link";
import { GameCoverImage } from "@/components/releases/GameCoverImage";
import type { ReleaseRadarItem } from "@/lib/types/database";

interface ProfileGamesTabProps {
  playingNow?: string | null;
  favoriteGames?: string[];
  guaranteedGames: ReleaseRadarItem[];
  radarGames: ReleaseRadarItem[];
  allRadarItemsMap?: Record<string, ReleaseRadarItem>;
  isOwner: boolean;
}

export function ProfileGamesTab({
  playingNow,
  favoriteGames = [],
  guaranteedGames,
  radarGames,
  allRadarItemsMap = {},
  isOwner,
}: ProfileGamesTabProps) {
  const hasGames = Boolean(
    playingNow ||
    favoriteGames.length > 0 ||
    guaranteedGames.length > 0 ||
    radarGames.length > 0
  );

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

  return (
    <div className="space-y-8">
      {playingNow && (
        <section aria-labelledby="playing-now-heading">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="text-base" aria-hidden="true">🎮</span>
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

      {favoriteGames.length > 0 && (
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

      {guaranteedGames.length > 0 && (
        <section aria-labelledby="guaranteed-games-heading">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">💎</span>
              <h3 id="guaranteed-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
                Garanti ({guaranteedGames.length})
              </h3>
            </div>
            <Link
              href="/lancamentos"
              className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-brand-orange"
            >
              Radar →
            </Link>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
            {guaranteedGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="group flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111217] w-48 shrink-0 sm:w-full transition-colors hover:border-brand-orange"
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

      {radarGames.length > 0 && (
        <section aria-labelledby="radar-games-heading">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base" aria-hidden="true">📡</span>
              <h3 id="radar-games-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
                No Radar ({radarGames.length})
              </h3>
            </div>
            <Link
              href="/lancamentos"
              className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-brand-orange"
            >
              Radar →
            </Link>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
            {radarGames.map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="group flex flex-col overflow-hidden rounded-sm border border-white/10 bg-[#111217] w-48 shrink-0 sm:w-full transition-colors hover:border-brand-orange"
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
    </div>
  );
}
