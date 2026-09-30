"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useFollowPreferences, type FollowType } from "@/lib/hooks/useFollowPreferences";

export function FollowButton({ type, value, label = "Acompanhar" }: { type: FollowType; value: string; label?: string }) {
  const { follows, isLoading, isSaving, error, isAuthenticated, toggleFollow } = useFollowPreferences();
  const [authOpen, setAuthOpen] = useState(false);
  const active = follows[type].includes(value);

  return (
    <>
      <button type="button" disabled={isLoading || isSaving} aria-pressed={active} onClick={() => isAuthenticated ? void toggleFollow(type, value) : setAuthOpen(true)} className={`min-h-11 border px-4 text-xs font-black uppercase tracking-wide transition-colors ${active ? "border-brand-orange bg-brand-orange text-white" : "border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10"}`}>
        {isSaving ? "Salvando…" : active ? "Acompanhando" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
