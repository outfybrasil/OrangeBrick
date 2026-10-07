import Link from "next/link";
import { GameCoverImage } from "@/components/releases/GameCoverImage";
import type { ReleaseRadarItem } from "@/lib/types/database";

interface ProfileSidebarProps {
  playingNow?: string | null;
  favoriteGames?: string[];
  guaranteedGames: ReleaseRadarItem[];
  radarGames: ReleaseRadarItem[];
  allRadarItemsMap?: Record<string, ReleaseRadarItem>;
  isOwner: boolean;
}

export function ProfileSidebar({
  playingNow,
  favoriteGames = [],
  guaranteedGames,
  radarGames,
  allRadarItemsMap = {},
  isOwner,
}: ProfileSidebarProps) {
  return (
    <aside aria-label="Informações gamer do perfil" className="space-y-6">
      {playingNow && (
        <div className="rounded-sm border border-brand-orange/40 bg-[#111217] p-5 shadow-lg">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
            <h3 className="font-heading text-xs font-black uppercase tracking-wider text-white">
              Jogando Agora
            </h3>
          </div>
          <div className="mt-3">
            <p className="font-heading text-base font-black uppercase text-brand-orange truncate">
              {playingNow}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">Atividade recente</p>
          </div>
        </div>
      )}

      {favoriteGames.length > 0 && (
        <div className="rounded-sm border border-white/10 bg-[#111217] p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <span className="text-sm" aria-hidden="true">⭐</span>
            <h3 className="font-heading text-xs font-black uppercase tracking-wider text-white">
              Favoritos
            </h3>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {favoriteGames.slice(0, 5).map((gameSlug) => {
              const matchedGame = allRadarItemsMap[gameSlug];
              const title = matchedGame ? matchedGame.game : gameSlug.replace(/-/g, " ");
              return (
                <Link
                  key={gameSlug}
                  href={`/games/${encodeURIComponent(gameSlug)}`}
                  className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-white/10 bg-[#16171D] transition-colors hover:border-brand-orange"
                  title={title}
                >
                  {matchedGame?.image_url ? (
                    <GameCoverImage
                      src={matchedGame.image_url}
                      alt={title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-1 text-center font-heading text-[10px] font-black uppercase text-gray-400 group-hover:text-brand-orange">
                      {title}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {guaranteedGames.length > 0 && (
        <div className="rounded-sm border border-white/10 bg-[#111217] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
              <h3 className="font-heading text-xs font-black uppercase tracking-wider text-white">
                Garanti ({guaranteedGames.length})
              </h3>
            </div>
            <Link
              href="/lancamentos"
              className="text-[11px] font-bold uppercase text-gray-400 hover:text-brand-orange"
            >
              Radar →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {guaranteedGames.slice(0, 3).map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="flex items-center justify-between rounded-sm p-2 text-xs transition-colors hover:bg-white/5"
              >
                <span className="truncate font-bold text-gray-300 hover:text-white">
                  {game.game}
                </span>
                <span className="shrink-0 text-[10px] font-mono text-gray-500">
                  {game.release_label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {radarGames.length > 0 && (
        <div className="rounded-sm border border-white/10 bg-[#111217] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
              <h3 className="font-heading text-xs font-black uppercase tracking-wider text-white">
                No Radar ({radarGames.length})
              </h3>
            </div>
            <Link
              href="/lancamentos"
              className="text-[11px] font-bold uppercase text-gray-400 hover:text-brand-orange"
            >
              Radar →
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {radarGames.slice(0, 3).map((game) => (
              <Link
                key={game.id}
                href={`/games/${encodeURIComponent(game.id)}`}
                className="flex items-center justify-between rounded-sm p-2 text-xs transition-colors hover:bg-white/5"
              >
                <span className="truncate font-bold text-gray-300 hover:text-white">
                  {game.game}
                </span>
                <span className="shrink-0 text-[10px] font-mono text-gray-500">
                  {game.release_label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="rounded-sm border border-white/10 bg-[#16171D] p-5 text-xs text-gray-400 space-y-3">
          <p className="font-bold text-white uppercase tracking-wider">
            Meu Painel Pessoal
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/configuracoes/perfil"
              className="flex items-center justify-between py-1.5 hover:text-brand-orange transition-colors"
            >
              <span>Editar Perfil &amp; Banner</span>
              <span>→</span>
            </Link>
            <Link
              href="/configuracoes/notificacoes"
              className="flex items-center justify-between py-1.5 hover:text-brand-orange transition-colors"
            >
              <span>Preferências de Notificação</span>
              <span>→</span>
            </Link>
            <Link
              href="/lancamentos"
              className="flex items-center justify-between py-1.5 hover:text-brand-orange transition-colors"
            >
              <span>Gerenciar Radar de Jogos</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
