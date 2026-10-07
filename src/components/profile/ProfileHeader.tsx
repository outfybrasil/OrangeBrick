"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileAvatar } from "./ProfileAvatar";
import { AuthModal } from "@/components/auth/AuthModal";

interface ProfileHeaderProps {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isOfficial?: boolean;
  isOwner: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollowLoading: boolean;
  onToggleFollow: () => Promise<void>;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  bio,
  isOfficial,
  isOwner,
  followersCount,
  followingCount,
  isFollowing,
  isFollowLoading,
  onToggleFollow,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    setMenuOpen(false);
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} (@${username}) no Orange Brick`,
          url,
        });
        return;
      } catch {
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link do perfil copiado!");
    } catch {
      showToast("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="relative px-4 sm:px-6 lg:px-8">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-sm bg-brand-orange px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-xl animate-fade-in"
        >
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
          <ProfileAvatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            isOfficial={isOfficial}
          />

          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-white sm:text-3xl lg:text-4xl">
              {displayName}
            </h1>
            <p className="font-mono text-xs text-gray-400 sm:text-sm">
              @{username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-end">
          {isOwner ? (
            <Link
              href="/configuracoes/perfil"
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-brand-orange/50 bg-[#16171D] px-5 text-xs font-black uppercase tracking-wider text-white transition-all hover:border-brand-orange hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              Editar Perfil
            </Link>
          ) : (
            <button
              type="button"
              disabled={isFollowLoading}
              onClick={() => void onToggleFollow()}
              className={`inline-flex min-h-11 items-center justify-center rounded-sm px-6 text-xs font-black uppercase tracking-wider transition-all focus-visible:outline-2 focus-visible:outline-brand-orange ${
                isFollowing
                  ? "border border-brand-orange bg-brand-orange text-white"
                  : "border border-brand-orange/60 bg-[#16171D] text-brand-orange hover:border-brand-orange hover:bg-brand-orange hover:text-white"
              }`}
            >
              {isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Mais opções"
              aria-expanded={menuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-white/10 bg-[#16171D] text-gray-400 transition-colors hover:border-brand-orange/40 hover:text-white"
            >
              •••
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-12 z-40 w-48 rounded-sm border border-white/10 bg-[#111217] py-1 shadow-2xl animate-fade-in"
                onClick={() => setMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-brand-orange"
                >
                  <span>Compartilhar perfil</span>
                </button>

                {isOwner ? (
                  <>
                    <Link
                      href="/configuracoes/perfil"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-brand-orange"
                    >
                      <span>Editar perfil</span>
                    </Link>
                    <Link
                      href="/configuracoes/notificacoes"
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-gray-300 transition-colors hover:bg-white/5 hover:text-brand-orange"
                    >
                      <span>Configurações</span>
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      showToast("Denúncia recebida para análise.");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-bold text-red-400 transition-colors hover:bg-white/5"
                  >
                    <span>Denunciar perfil</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 max-w-2xl">
        {bio ? (
          <p className="text-sm leading-relaxed text-gray-300 sm:text-base">
            {bio}
          </p>
        ) : isOwner ? (
          <Link
            href="/configuracoes/perfil"
            className="inline-block text-xs font-bold text-brand-orange hover:underline"
          >
            + Adicionar bio ao seu perfil
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-400">
        <button
          type="button"
          onClick={onOpenFollowers}
          className="transition-colors hover:text-white focus-visible:outline-none"
        >
          <strong className="font-heading font-black text-white">{followersCount}</strong>{" "}
          {followersCount === 1 ? "seguidor" : "seguidores"}
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={onOpenFollowing}
          className="transition-colors hover:text-white focus-visible:outline-none"
        >
          <strong className="font-heading font-black text-white">{followingCount}</strong> seguindo
        </button>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
