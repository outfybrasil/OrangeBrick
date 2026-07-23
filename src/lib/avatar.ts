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

  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
}
