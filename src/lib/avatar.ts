export function resolveAvatarUrl(avatarUrl?: string | null, authorName?: string | null): string {
  const name = (authorName || "").toLowerCase().trim();
  const raw = (avatarUrl || "").trim();

  const isOfficial =
    name === "orange brick" ||
    name === "orangebrick" ||
    name === "orange_brick" ||
    raw.toLowerCase() === "orangebrick" ||
    raw.toLowerCase() === "orange brick" ||
    raw.toLowerCase() === "orange_brick";

  if (isOfficial) {
    return "/logos/Logo Tijolo Quebrado.PNG";
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  const displayName = authorName || "Leitor";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=12141C&color=FF5E00&bold=true`;
}
