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

export function publishedPostCursorFilter(post: { id: string; published_at: string | null }): string {
  if (!/^[0-9a-f-]+$/i.test(post.id)) throw new Error("Cursor inválido");
  if (!post.published_at) return `and(published_at.is.null,id.lt.${post.id})`;
  if (!/^[0-9T:+.Z-]+$/.test(post.published_at) || !Number.isFinite(Date.parse(post.published_at))) throw new Error("Cursor inválido");
  return `published_at.lt.${post.published_at},and(published_at.eq.${post.published_at},id.lt.${post.id}),published_at.is.null`;
}

export function selectFeaturedNews<T extends { is_featured?: boolean | null; featured_priority?: number | null }>(posts: T[]): T | null {
  let featured: T | null = null;
  for (const post of posts) {
    if (post.is_featured && (!featured || (post.featured_priority ?? 0) > (featured.featured_priority ?? 0))) featured = post;
  }
  return featured || posts[0] || null;
}
