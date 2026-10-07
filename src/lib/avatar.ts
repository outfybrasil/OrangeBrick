import type { User } from "@supabase/supabase-js";

function isTrustedGoogleAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "lh3.googleusercontent.com"
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

function getSupabaseOrigin(): string | null {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return null;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return null;
  }
}

function isTrustedStorageAvatarUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const supabaseOrigin = getSupabaseOrigin();
    return Boolean(supabaseOrigin)
      && url.protocol === "https:"
      && url.origin === supabaseOrigin
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

export function isAllowedUserAvatarUrl(value: string, userId: string): boolean {
  if (isTrustedGoogleAvatarUrl(value)) return true;

  try {
    const url = new URL(value);
    const expectedPath = "/storage/v1/object/public/profile-images/" + userId + "/";
    const filename = url.pathname.slice(expectedPath.length);
    return isTrustedStorageAvatarUrl(value)
      && url.pathname.startsWith(expectedPath)
      && /^avatar-[0-9a-f-]{36}\.webp$/i.test(filename)
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

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
      typeof candidate === "string" && isTrustedGoogleAvatarUrl(candidate.trim())
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

  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) {
    try {
      if (new URL(raw, "https://orangebrick.blog").origin === "https://orangebrick.blog") return raw;
    } catch {
      return fallbackAvatar(authorName);
    }
  }

  if (isTrustedGoogleAvatarUrl(raw) || isTrustedStorageAvatarUrl(raw)) {
    return raw;
  }

  return fallbackAvatar(authorName);
}
