import { NextResponse } from "next/server";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { loadTodayAudienceMetrics } from "@/lib/server/today-audience-metrics";

type SocialMetricSnapshot = {
  post_id: string;
  platform: string;
  views: number | null;
  reach: number | null;
  average_watch_milliseconds: number | null;
  watch_time_milliseconds: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  follows: number | null;
  interactions: number | null;
  error: string | null;
  captured_on: string;
  captured_at: string;
};

type SocialClickCount = { post_id: string; platform: string; clicks: number };
type SocialPost = { id: string; slug: string; title: string };

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: { user }, error } = await createPublicServerClient().auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") || 7);
  if (![1, 7, 30, 90].includes(days)) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  const client = createServiceDataClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60_000).toISOString();
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now).map(part => [part.type, part.value]));
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const snapshotQuery = client.from("reel_social_metrics").select("post_id,platform,captured_on,captured_at,views,reach,average_watch_milliseconds,watch_time_milliseconds,likes,comments,shares,saves,follows,interactions,error");
  const periodSnapshots = days === 1 ? snapshotQuery.gte("captured_on", today).lte("captured_on", today) : snapshotQuery.gte("captured_at", cutoff);
  const metricsPromise = days === 1 ? loadTodayAudienceMetrics(client, now) : Promise.all([
    client.rpc("admin_audience_metrics", { p_days: days }),
    client.rpc("admin_site_metrics", { p_days: days }),
    client.rpc("admin_reel_social_click_counts", { p_days: days }),
  ]).then(([result, site, clickResult]) => {
    if (result.error || site.error || clickResult.error) throw new Error("Metrics unavailable");
    return { audience: result.data as object, site: site.data, clicks: (clickResult.data || []) as unknown as SocialClickCount[] };
  });
  const [metrics, snapshotResult, accountResult] = await Promise.all([
    metricsPromise.catch(() => null),
    periodSnapshots.order("captured_at", { ascending: false }).limit(1000),
    client.from("reel_account_metrics").select("platform,captured_on,captured_at,followers,following,total_posts,total_views,total_likes,error").order("captured_on", { ascending: false }).limit(90),
  ]);
  if (!metrics || snapshotResult.error) return NextResponse.json({ error: "Não foi possível carregar as métricas. Tente novamente." }, { status: 503 });
  const snapshots = (snapshotResult.data || []) as unknown as SocialMetricSnapshot[];
  const clicks = metrics.clicks;
  const latest = new Map<string, SocialMetricSnapshot>();
  for (const row of snapshots) {
    const key = `${row.post_id}:${row.platform}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  const clickCounts = new Map(clicks.map(row => [`${row.post_id}:${row.platform}`, row.clicks]));
  const postIds = [...new Set([...latest.values()].map(row => row.post_id).concat(clicks.map(row => row.post_id)))];
  const [{ data: postsData, error: postsError }, { data: jobsData }] = await Promise.all([
    postIds.length ? client.from("posts").select("id,slug,title").in("id", postIds) : { data: [], error: null },
    postIds.length ? client.from("reel_jobs").select("post_id,script").in("post_id", postIds).eq("status", "ready") : { data: [], error: null },
  ]);
  if (postsError) return NextResponse.json({ error: "Não foi possível relacionar as métricas às matérias." }, { status: 503 });
  const posts = (postsData || []) as unknown as SocialPost[];
  const postsById = new Map<string, SocialPost>(posts.map(post => [post.id, post]));
  const ctaVariantByPost = new Map<string, string>();
  for (const job of (jobsData || []) as Array<{ post_id: string; script: unknown }>) {
    const script = job.script as { ctaVariant?: string } | null;
    if (script?.ctaVariant && !ctaVariantByPost.has(job.post_id)) {
      ctaVariantByPost.set(job.post_id, script.ctaVariant);
    }
  }
  const socialKeys = new Set([...latest.keys(), ...clickCounts.keys()]);
  const social = [...socialKeys].flatMap(key => {
    const [postId, platform] = key.split(":");
    const post = postsById.get(postId);
    if (!post || !["instagram", "tiktok", "youtube"].includes(platform)) return [];
    return [{ post_id: postId, platform, slug: post.slug, title: post.title, cta_variant: ctaVariantByPost.get(postId) || "comment", ...(latest.get(key) || {}), clicks: clickCounts.get(key) || 0 }];
  }).sort((left, right) => (right.views || 0) - (left.views || 0));
  return NextResponse.json({ ...metrics.audience, site: metrics.site, social, accounts: accountResult.data || [] }, { headers: { "Cache-Control": "private, no-store" } });
}
