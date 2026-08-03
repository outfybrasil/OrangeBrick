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

function fallbackAvatar(authorName?: string | null): string {
  const initials = (authorName || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "?";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="#1C1E24"/><circle cx="64" cy="64" r="60" fill="none" stroke="#FF5E00" stroke-width="5"/><text x="64" y="73" text-anchor="middle" fill="#FFFFFF" font-family="Arial,sans-serif" font-size="42" font-weight="700">${initials.replace(/[<>&"']/g, "")}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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

  return fallbackAvatar(authorName);
}
