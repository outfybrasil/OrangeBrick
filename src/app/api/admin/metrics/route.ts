import { NextResponse } from "next/server";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { isVerifiedAdminSession } from "@/lib/auth";

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
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  const client = createServiceDataClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000).toISOString();
  const [result, site, snapshotResult, clickResult] = await Promise.all([
    client.rpc("admin_audience_metrics", { p_days: days }),
    client.rpc("admin_site_metrics", { p_days: days }),
    client.from("reel_social_metrics").select("post_id,platform,captured_on,captured_at,views,reach,average_watch_milliseconds,watch_time_milliseconds,likes,comments,shares,saves,follows,interactions,error").gte("captured_at", cutoff).order("captured_at", { ascending: false }).limit(1000),
    client.rpc("admin_reel_social_click_counts", { p_days: days }),
  ]);
  if (result.error || site.error || snapshotResult.error || clickResult.error) return NextResponse.json({ error: "Não foi possível carregar as métricas. Tente novamente." }, { status: 503 });
  const snapshots = (snapshotResult.data || []) as unknown as SocialMetricSnapshot[];
  const clicks = (clickResult.data || []) as unknown as SocialClickCount[];
  const latest = new Map<string, SocialMetricSnapshot>();
  for (const row of snapshots) {
    const key = `${row.post_id}:${row.platform}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  const clickCounts = new Map(clicks.map(row => [`${row.post_id}:${row.platform}`, row.clicks]));
  const postIds = [...new Set([...latest.values()].map(row => row.post_id).concat(clicks.map(row => row.post_id)))];
  const { data: postsData, error: postsError } = postIds.length
    ? await client.from("posts").select("id,slug,title").in("id", postIds)
    : { data: [], error: null };
  if (postsError) return NextResponse.json({ error: "Não foi possível relacionar as métricas às matérias." }, { status: 503 });
  const posts = (postsData || []) as unknown as SocialPost[];
  const postsById = new Map<string, SocialPost>(posts.map(post => [post.id, post]));
  const socialKeys = new Set([...latest.keys(), ...clickCounts.keys()]);
  const social = [...socialKeys].flatMap(key => {
    const [postId, platform] = key.split(":");
    const post = postsById.get(postId);
    if (!post || !["instagram", "tiktok", "youtube"].includes(platform)) return [];
    return [{ post_id: postId, platform, slug: post.slug, title: post.title, ...(latest.get(key) || {}), clicks: clickCounts.get(key) || 0 }];
  }).sort((left, right) => (right.views || 0) - (left.views || 0));
  return NextResponse.json({ ...result.data as object, site: site.data, social }, { headers: { "Cache-Control": "private, no-store" } });
}
