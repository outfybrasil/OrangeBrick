const RETURN_TO_ORIGIN = "https://orange-brick.invalid";

export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  try {
    const fallbackUrl = new URL(fallback, RETURN_TO_ORIGIN);
    const target = new URL(value || fallbackUrl.pathname, RETURN_TO_ORIGIN);
    if (target.origin !== RETURN_TO_ORIGIN || target.pathname === "/auth/callback") {
      return `${fallbackUrl.pathname}${fallbackUrl.search}${fallbackUrl.hash}`;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
