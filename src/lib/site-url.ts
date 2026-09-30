export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL;
  const fallbackUrl = process.env.VERCEL === "1" ? "https://orangebrick.blog" : "http://localhost:3000";
  if (!configuredUrl) return fallbackUrl;
  const candidate = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`;
  try {
    const url = new URL(candidate);
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && localHosts.has(url.hostname))) || url.username || url.password) {
      return fallbackUrl;
    }
    if (process.env.VERCEL === "1" && (url.hostname.endsWith(".vercel.app") || localHosts.has(url.hostname))) {
      return "https://orangebrick.blog";
    }
    return url.origin;
  } catch {
    return fallbackUrl;
  }
}
