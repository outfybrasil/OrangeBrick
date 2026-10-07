"use client";

import { createContext, use, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";
import { getGoogleAvatarUrl } from "@/lib/avatar";
import { safeReturnTo } from "@/lib/auth/return-to";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createDataClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (authenticatedUser: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authenticatedUser.id)
      .maybeSingle<Profile>();

    const googleAvatarUrl = getGoogleAvatarUrl(authenticatedUser);
    if (data) {
      if (!data.avatar_url && googleAvatarUrl) {
        setProfile({ ...data, avatar_url: googleAvatarUrl });
        void supabase.from("profiles").update({ avatar_url: googleAvatarUrl }).eq("user_id", authenticatedUser.id);
        return;
      }
      setProfile(data);
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
  }, [supabase]);

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
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext value={{ user, profile, isLoading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
