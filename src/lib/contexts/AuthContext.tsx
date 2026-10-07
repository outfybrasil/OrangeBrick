"use client";

import { createContext, use, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";
import { getGoogleAvatarUrl } from "@/lib/avatar";
import { safeReturnTo } from "@/lib/auth/return-to";
import {
  getSavedAccounts,
  saveAccount,
  removeSavedAccount,
  clearAllSavedAccounts,
  upsertAccountFromSession,
  type SavedAccount,
} from "@/lib/auth/saved-accounts";

export type { SavedAccount };

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  savedAccounts: SavedAccount[];
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  switchAccount: (userId: string) => Promise<boolean>;
  removeAccount: (userId: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createDataClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());

  const syncSavedAccount = useCallback(async (authenticatedUser: User, currentProfile: Profile | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        upsertAccountFromSession(authenticatedUser, currentProfile, session);
        setSavedAccounts(getSavedAccounts());
      }
    } catch {
    }
  }, [supabase]);

  const fetchProfile = useCallback(async (authenticatedUser: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authenticatedUser.id)
      .maybeSingle<Profile>();

    const googleAvatarUrl = getGoogleAvatarUrl(authenticatedUser);
    if (data) {
      if (!data.avatar_url && googleAvatarUrl) {
        const updated = { ...data, avatar_url: googleAvatarUrl };
        setProfile(updated);
        void supabase.from("profiles").update({ avatar_url: googleAvatarUrl }).eq("user_id", authenticatedUser.id);
        void syncSavedAccount(authenticatedUser, updated);
        return;
      }
      setProfile(data);
      void syncSavedAccount(authenticatedUser, data);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/user/profile", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (res.ok) {
        const payload = (await res.json()) as { profile?: Profile | null };
        if (payload.profile) {
          setProfile(payload.profile);
          void syncSavedAccount(authenticatedUser, payload.profile);
          return;
        }
      }
    } catch {
    }

    const initialName = (
      authenticatedUser.user_metadata?.full_name ||
      authenticatedUser.user_metadata?.name ||
      authenticatedUser.email?.split("@")[0] ||
      "Jogador"
    ).slice(0, 30);
    const cleanUsername = (
      authenticatedUser.user_metadata?.user_name ||
      authenticatedUser.email?.split("@")[0] ||
      "jogador"
    ).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);
    const provisionalUsername = `${cleanUsername || "jogador"}-${authenticatedUser.id.slice(0, 4)}`;

    const fallbackProfile: Profile = {
      id: authenticatedUser.id,
      user_id: authenticatedUser.id,
      nickname: initialName,
      display_name: initialName,
      username: provisionalUsername,
      avatar_url: googleAvatarUrl || null,
      banner_url: null,
      bio: null,
      is_official: false,
      favorite_platforms: [],
      favorite_categories: [],
      profile_theme: "default",
      show_lifetime_xp: true,
      show_activity_stats: true,
      show_season_history: true,
      show_in_leaderboard: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setProfile(fallbackProfile);
    void syncSavedAccount(authenticatedUser, fallbackProfile);
  }, [supabase, syncSavedAccount]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "ob_saved_accounts_v1") {
        setSavedAccounts(getSavedAccounts());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }
      setSavedAccounts(getSavedAccounts());
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signInWithGoogle = useCallback(async (returnTo = "/") => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("next", safeReturnTo(returnTo));

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) throw error;
  }, [supabase]);

  const switchAccount = useCallback(async (targetUserId: string): Promise<boolean> => {
    const accounts = getSavedAccounts();
    const target = accounts.find((a) => a.userId === targetUserId);
    if (!target) return false;

    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: target.accessToken,
        refresh_token: target.refreshToken,
      });

      if (error || !data.session) {
        removeSavedAccount(targetUserId);
        setSavedAccounts(getSavedAccounts());
        return false;
      }

      saveAccount({
        ...target,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        lastActiveAt: Date.now(),
      });
      setSavedAccounts(getSavedAccounts());
      setUser(data.session.user);
      if (data.session.user) {
        await fetchProfile(data.session.user);
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
      return true;
    } catch {
      removeSavedAccount(targetUserId);
      setSavedAccounts(getSavedAccounts());
      return false;
    }
  }, [supabase, fetchProfile]);

  const removeAccount = useCallback((targetUserId: string) => {
    removeSavedAccount(targetUserId);
    setSavedAccounts(getSavedAccounts());
  }, []);

  const signOutAll = useCallback(async () => {
    clearAllSavedAccounts();
    setSavedAccounts([]);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    const currentUserId = user?.id;
    if (currentUserId) {
      removeSavedAccount(currentUserId);
    }
    const remaining = getSavedAccounts();
    setSavedAccounts(remaining);

    if (remaining.length > 0) {
      const nextAccount = remaining[0];
      const switched = await switchAccount(nextAccount.userId);
      if (switched) return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [supabase, user, switchAccount]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext value={{
      user,
      profile,
      isLoading,
      savedAccounts,
      signInWithGoogle,
      signOut,
      signOutAll,
      switchAccount,
      removeAccount,
      refreshProfile,
    }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
