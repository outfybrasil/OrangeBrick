"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { resolveAvatarUrl } from "@/lib/avatar";

export function UserNav() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const isAdmin = user?.email?.toLowerCase() === "orangebrick0@gmail.com";

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card-slate/60 hover:bg-card-slate text-white border border-brand-orange-muted/20 hover:border-brand-orange/40 font-subtitle text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
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
  const rawAvatar = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const avatarUrl = resolveAvatarUrl(rawAvatar, displayName);

  return (
    <div ref={dropdownRef} className="flex items-center gap-2 relative">
      <NotificationCenter />
      {/* DIRECT PAINEL ADMIN BUTTON IN HEADER (EXCLUSIVELY FOR ADMIN) */}
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-subtitle text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_15px_rgba(255,94,0,0.3)] transition-all cursor-pointer whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="hidden md:inline">Painel Admin</span>
          <span className="md:hidden">Admin</span>
        </Link>
      )}

      {/* USER PROFILE TRIGGER BUTTON */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-card-slate/80 hover:bg-card-slate border border-brand-orange-muted/20 hover:border-brand-orange/40 transition-all cursor-pointer"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-brand-orange/30"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center font-bold text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-xs font-subtitle font-bold text-white max-w-[100px] truncate hidden sm:inline-block">
          {displayName}
        </span>
        <span className="text-[10px] text-gray-400">▼</span>
      </button>

      {/* DROPDOWN MENU */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-card-slate border border-brand-orange-muted/30 rounded-xl p-2 shadow-2xl z-50 space-y-1 font-subtitle text-xs backdrop-blur-md animate-fade-in">
          <div className="px-3 py-2 border-b border-brand-orange-muted/10">
            <p className="font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-brand-orange hover:bg-brand-orange/10 font-bold transition-colors"
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 font-medium transition-colors text-left"
          >
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
