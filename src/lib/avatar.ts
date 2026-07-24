import type { User } from "@supabase/supabase-js";

export function getGoogleAvatarUrl(user?: User | null): string | null {
  if (!user) return null;

  const metadataCandidates = [
    user.user_metadata?.avatar_url,
    user.user_metadata?.picture,
  ];
  const identityCandidates = user.identities?.flatMap((identity) => [
    identity.identity_data?.avatar_url,
    identity.identity_data?.picture,
  ]) ?? [];

  const avatarUrl = [...metadataCandidates, ...identityCandidates].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().startsWith("https://")
  );

  return avatarUrl?.trim() || null;
}

export function resolveAvatarUrl(avatarUrl?: string | null, authorName?: string | null, isOfficial = false): string {
  const raw = (avatarUrl || "").trim();

  if (isOfficial) {
    return "/logos/Logo Tijolo Quebrado.PNG";
  }

  if (
    raw.startsWith("https://") ||
    raw.startsWith("/")
  ) {
    return raw;
  }

  const displayName = authorName || "Leitor";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=12141C&color=FF5E00&bold=true`;
}
