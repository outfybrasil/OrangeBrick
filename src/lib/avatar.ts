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
