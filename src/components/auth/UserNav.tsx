"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { BookmarkDrawer } from "@/components/ui/BookmarkDrawer";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";
import { isAdminUser } from "@/lib/auth";

export function UserNav() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-card-slate animate-pulse border border-brand-orange-muted/20" />
    );
  }

  const isAdmin = isAdminUser(user);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl border border-brand-orange-muted/20 bg-card-slate/60 px-3 text-xs font-bold text-white transition-all hover:border-brand-orange/40 hover:bg-card-slate sm:px-4"
        >
          <svg className="w-3.5 h-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Entrar</span>
        </button>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  const displayName = profile?.nickname || user.user_metadata?.full_name || user.email?.split("@")[0] || "Leitor";
  const rawAvatar = profile?.avatar_url || getGoogleAvatarUrl(user);
  const avatarUrl = resolveAvatarUrl(rawAvatar, displayName);

  return (
    <>
      <div ref={dropdownRef} className="flex items-center gap-2 relative">
        {/* USER PROFILE TRIGGER BUTTON */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-brand-orange-muted/20 bg-card-slate/80 p-1.5 transition-all hover:border-brand-orange/40 hover:bg-card-slate sm:pr-3"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px", maxWidth: "28px", maxHeight: "28px", borderRadius: "9999px", objectFit: "cover" }}
              className="border border-brand-orange/30 shrink-0 bg-[#08090C]"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-subtitle font-bold text-white max-w-[100px] truncate hidden sm:inline-block">
            {displayName}
          </span>
          <span className="hidden text-[10px] text-gray-400 xs:inline">▼</span>
        </button>

        {/* NOTIFICATION BELL ON THE RIGHT SIDE OF PROFILE */}
        <NotificationCenter />

        {/* DROPDOWN MENU */}
        {isDropdownOpen && (
          <div className="fixed inset-x-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+3.5rem)] z-50 space-y-1 rounded-xl border border-brand-orange-muted/30 bg-card-slate p-2 text-xs shadow-2xl animate-fade-in sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56">
            <div className="px-3 py-2 border-b border-brand-orange-muted/10">
              <p className="font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>

            {/* ITEM: MATÉRIAS SALVAS */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setIsBookmarkOpen(true);
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left font-bold text-gray-300 transition-colors hover:bg-brand-orange/10 hover:text-white"
            >
              <svg className="w-4 h-4 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              <span>Matérias Salvas</span>
            </button>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsDropdownOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-brand-orange transition-colors hover:bg-brand-orange/10"
              >
                <svg className="w-4 h-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Painel Admin</span>
              </Link>
            )}

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                signOut();
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left font-medium text-red-300/80 transition-colors hover:bg-red-500/15 hover:text-red-200"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>

      {/* DRAWER DE MATÉRIAS SALVAS ACCESSIBLE FROM ANY PAGE */}
      <BookmarkDrawer
        isOpen={isBookmarkOpen}
        onClose={() => setIsBookmarkOpen(false)}
      />
    </>
  );
}
