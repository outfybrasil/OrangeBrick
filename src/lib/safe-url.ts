const INTERNAL_ORIGIN = "https://orange-brick.invalid";

export function safeLinkUrl(value: string, allowInternal = true): string | null {
  if (typeof value !== "string" || /[\u0000-\u0020\u007f\\]/.test(value)) return null;
  try {
    const internal = value.startsWith("/") && !value.startsWith("//");
    if (internal && !allowInternal) return null;
    if (!internal && !/^https?:\/\//i.test(value)) return null;
    const url = new URL(value, INTERNAL_ORIGIN);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (internal && url.origin !== INTERNAL_ORIGIN) return null;
    return internal ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch {
    return null;
  }
}
