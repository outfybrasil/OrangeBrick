export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL;
  if (!configuredUrl) return "http://localhost:3000";
  return configuredUrl.startsWith("http") ? configuredUrl.replace(/\/$/, "") : `https://${configuredUrl.replace(/\/$/, "")}`;
}
