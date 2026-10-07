import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";
import { getGoogleAvatarUrl, resolveAvatarUrl } from "@/lib/avatar";

export interface SavedAccount {
  userId: string;
  email: string;
  nickname: string;
  username: string;
  avatarUrl: string | null;
  equippedTitle: string | null;
  accessToken: string;
  refreshToken: string;
  lastActiveAt: number;
}

const STORAGE_KEY = "ob_saved_accounts_v1";

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedAccount =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.userId === "string" &&
            typeof item.refreshToken === "string"
        )
    );
  } catch {
    return [];
  }
}

export function saveAccount(account: SavedAccount): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedAccounts();
    const index = current.findIndex((a) => a.userId === account.userId);
    let updated: SavedAccount[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...account, lastActiveAt: Date.now() };
    } else {
      updated = [{ ...account, lastActiveAt: Date.now() }, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
  }
}

export function removeSavedAccount(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedAccounts();
    const updated = current.filter((a) => a.userId !== userId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
  }
}

export function clearAllSavedAccounts(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

export function upsertAccountFromSession(
  user: User,
  profile: Profile | null,
  session: Session
): void {
  if (typeof window === "undefined" || !session.refresh_token) return;
  const displayName =
    profile?.nickname ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Jogador";
  const rawAvatar = profile?.avatar_url || getGoogleAvatarUrl(user);
  const avatarUrl = resolveAvatarUrl(rawAvatar, displayName);

  saveAccount({
    userId: user.id,
    email: user.email || "",
    nickname: displayName,
    username:
      profile?.username ||
      displayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18),
    avatarUrl,
    equippedTitle: profile?.equipped_title || null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    lastActiveAt: Date.now(),
  });
}
