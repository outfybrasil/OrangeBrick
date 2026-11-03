const canonicalSiteUrl = "https://orangebrick.blog";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL;
  const isVercel = process.env.VERCEL === "1";
  const fallbackUrl = isVercel ? canonicalSiteUrl : "http://localhost:3000";
  if (!configuredUrl) return fallbackUrl;
  const candidate = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;
  try {
    const url = new URL(candidate);
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && localHosts.has(url.hostname))) || url.username || url.password) {
      return fallbackUrl;
    }
    if (isVercel && (
      url.hostname === "orangebrick.blog"
      || url.hostname === "www.orangebrick.blog"
      || url.hostname.endsWith(".vercel.app")
      || localHosts.has(url.hostname)
    )) {
      return canonicalSiteUrl;
    }
    return url.origin;
  } catch {
    return fallbackUrl;
  }
}
