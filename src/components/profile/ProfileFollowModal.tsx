"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveAvatarUrl } from "@/lib/avatar";

export interface FollowUserItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
}

interface ProfileFollowModalProps {
  isOpen: boolean;
  type: "followers" | "following";
  username: string;
  items: FollowUserItem[];
  isLoading: boolean;
  onClose: () => void;
}

export function ProfileFollowModal({
  isOpen,
  type,
  items,
  isLoading,
  onClose,
}: ProfileFollowModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = type === "followers" ? "Seguidores" : "Seguindo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-sm border border-white/10 bg-[#111217] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 id="follow-modal-title" className="font-heading text-lg font-black uppercase text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5 p-2 scrollbar-none">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange/30 border-t-brand-orange" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {type === "followers"
                ? "Nenhum seguidor ainda."
                : "Não está seguindo ninguém ainda."}
            </div>
          ) : (
            items.map((user) => {
              const avatar = resolveAvatarUrl(user.avatar_url);
              return (
                <Link
                  key={user.id}
                  href={`/u/${encodeURIComponent(user.username)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-white/5 rounded-sm"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-card-slate">
                    {avatar ? (
                      <Image src={avatar} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-heading text-xs font-black text-brand-orange">
                        {user.display_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{user.display_name}</p>
                    <p className="truncate text-xs text-gray-400">@{user.username}</p>
                  </div>
                  <span className="text-xs font-bold text-brand-orange">Ver perfil →</span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
