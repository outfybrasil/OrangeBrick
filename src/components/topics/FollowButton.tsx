"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useFollowPreferences, type FollowType } from "@/lib/hooks/useFollowPreferences";

export function FollowButton({ type, value, label = "Acompanhar" }: { type: FollowType; value: string; label?: string }) {
  const { follows, isLoading, isAuthenticated, toggleFollow } = useFollowPreferences();
  const [authOpen, setAuthOpen] = useState(false);
  const active = follows[type].includes(value);

  return (
    <>
      <button type="button" disabled={isLoading} aria-pressed={active} onClick={() => isAuthenticated ? void toggleFollow(type, value) : setAuthOpen(true)} className={`min-h-11 border px-4 text-xs font-black uppercase tracking-wide transition-colors ${active ? "border-brand-orange bg-brand-orange text-white" : "border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10"}`}>
        {active ? "Acompanhando" : label}
      </button>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
