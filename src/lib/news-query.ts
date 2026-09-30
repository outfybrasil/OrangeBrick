export function parseNewsPage(value: string | null, maximumPage = 500): number | null {
  const raw = value || "1";
  if (!/^\d+$/.test(raw)) return null;
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page < 1 || page > maximumPage) return null;
  return page;
}

export function normalizeNewsSearch(value: string, maximumLength = 80): string {
  return value
    .replace(/[%*_,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

export function getNewsRateLimit(search: string) {
  return search.length >= 2
    ? { action: "news_search", limit: 30 }
    : { action: "news_feed", limit: 180 };
}
