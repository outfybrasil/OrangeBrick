import type { createServiceDataClient } from "../supabase/server";

type MetricsClient = ReturnType<typeof createServiceDataClient>;
type SiteVisit = { path: string; visitor_hash: string };
type ArticleView = { post_id: string; device_id: string };
type Interaction = { post_id: string };
type SocialClick = { post_id: string; platform: string };
type Article = { id: string; title: string; slug: string };

function todayInSaoPaulo(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = (date: Date) => Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const today = parts(now);
  const day = `${today.year}-${today.month}-${today.day}`;
  const target = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));
  let midnight = target;
  for (let attempt = 0; attempt < 3; attempt++) {
    const local = parts(new Date(midnight));
    const observed = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second));
    const adjustment = target - observed;
    if (adjustment === 0) return { day, start: new Date(midnight).toISOString() };
    midnight += adjustment;
  }
  throw new Error("Could not determine the start of the day");
}

async function readRows<T>(client: MetricsClient, table: string, columns: string, timestamp: string, start: string, end: string): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  for (;;) {
    const { data, error, count } = await client.from(table).select(columns, { count: "exact" }).gte(timestamp, start).lte(timestamp, end).order("id").range(rows.length, rows.length + pageSize - 1);
    if (error || count === null) throw error || new Error("Could not count metric rows");
    const page = (data || []) as unknown as T[];
    rows.push(...page);
    if (rows.length >= count) return rows;
    if (page.length === 0) throw new Error("Could not read all metric rows");
  }
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

export async function loadTodayAudienceMetrics(client: MetricsClient, now: Date) {
  const { day, start } = todayInSaoPaulo(now);
  const end = now.toISOString();
  const [visits, views, reactions, comments, socialClicks] = await Promise.all([
    readRows<SiteVisit>(client, "audience_pageviews", "path,visitor_hash", "created_at", start, end),
    readRows<ArticleView>(client, "post_views", "post_id,device_id", "viewed_at", start, end),
    readRows<Interaction>(client, "reactions", "post_id", "created_at", start, end),
    readRows<Interaction>(client, "comments", "post_id", "created_at", start, end),
    readRows<SocialClick>(client, "reel_social_clicks", "post_id,platform", "clicked_at", start, end),
  ]);
  const pageCounts = countBy(visits, visit => visit.path);
  const articleCounts = countBy(views, view => view.post_id);
  const interactionCounts = countBy([...reactions, ...comments], interaction => interaction.post_id);
  const topViews = [...articleCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  const { data: postData, error: postError } = topViews.length
    ? await client.from("posts").select("id,title,slug").in("id", topViews.map(([id]) => id))
    : { data: [], error: null };
  if (postError) throw postError;
  const posts = new Map(((postData || []) as unknown as Article[]).map(post => [post.id, post]));
  const top = topViews.flatMap(([id, total]) => {
    const post = posts.get(id);
    return post ? [{ ...post, views: total, interactions: interactionCounts.get(id) || 0 }] : [];
  });
  const clickCounts = countBy(socialClicks, click => `${click.post_id}:${click.platform}`);
  const clicks = [...clickCounts].map(([key, count]) => {
    const [post_id, platform] = key.split(":");
    return { post_id, platform, clicks: count };
  });
  const interactions = reactions.length + comments.length;
  return {
    audience: {
      readers: new Set(views.map(view => view.device_id)).size,
      views: views.length,
      reactions: reactions.length,
      comments: comments.length,
      daily: [{ day, views: views.length, interactions }],
      top,
    },
    site: {
      visitors: new Set(visits.map(visit => visit.visitor_hash)).size,
      pageviews: visits.length,
      daily: [{ day, views: visits.length, visitors: new Set(visits.map(visit => visit.visitor_hash)).size }],
      pages: [...pageCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([path, count]) => ({ path, views: count })),
    },
    clicks,
  };
}
