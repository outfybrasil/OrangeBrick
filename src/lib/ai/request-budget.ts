export function boundedRequestTimeout(deadline: number, maximum: number, now = Date.now()): number {
  if (!Number.isFinite(deadline) || !Number.isFinite(maximum) || !Number.isFinite(now) || maximum <= 0) return 0;
  return Math.max(0, Math.min(maximum, deadline - now));
}
