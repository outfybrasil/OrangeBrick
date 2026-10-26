import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { getReelAdmin } from "@/lib/video/reel-remote";
import { callComposio, getYouTubeConnection } from "@/lib/video/reel-youtube";
import { generateSocialCopys } from "@/lib/video/reel-service";
import type { ReelScriptData } from "@/lib/video/reel-script";
import type { Json } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Platform = "instagram" | "tiktok" | "youtube";
type SocialPublication = { post_id: string; platform: Platform; status: string; external_id: string | null; platform_media_id: string | null };
type YouTubePublication = { post_id: string; video_id: string; tags: string[] | null };
type MetricValues = { views: number | null; reach: number | null; average_watch_milliseconds: number | null; watch_time_milliseconds: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; follows: number | null; interactions: number | null; error: string | null };
type RecordData = Record<string, unknown>;

function object(value: unknown): RecordData {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {};
}

function numberOrNull(value: unknown) {
  const result = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(result) && result >= 0 ? result : null;
}

function metricFrom(data: unknown, name: string) {
  const metrics = Array.isArray(data) ? data : Array.isArray(object(data).data) ? object(data).data as unknown[] : [];
  const metric = metrics.map(object).find(item => item.name === name);
  if (!metric) return null;
  const values = Array.isArray(metric.values) ? metric.values : [];
  const value = values.length ? object(values[0]).value : metric.value;
  return numberOrNull(value);
}

async function composioProxy(accountId: string, userId: string, endpoint: string, method: string, body?: RecordData) {
  const response = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
    method: "POST",
    headers: { "x-api-key": process.env.COMPOSIO_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ connected_account_id: accountId, user_id: userId, endpoint, method, ...(body ? { headers: { "Content-Type": "application/json; charset=UTF-8" }, body } : {}) }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const envelope = object(await response.json().catch(() => null));
  let data: unknown = envelope.data;
  for (let depth = 0; depth < 3; depth++) {
    const current = object(data);
    const errObj = object(current.error);
    const isError = Boolean(current.error && errObj.code !== "ok" && (errObj.message || errObj.code || typeof current.error === "string"));
    if (isError) throw new Error(String(errObj.message || current.error || "A plataforma recusou a consulta de métricas."));
    if (current.data === undefined) break;
    data = current.data;
  }
  const errObj = object(object(data).error);
  if (!response.ok) throw new Error(String(errObj.message || "A plataforma recusou a consulta de métricas."));
  return data;
}

async function instagramMetrics(publication: SocialPublication, userId: string): Promise<MetricValues> {
  const account = process.env.COMPOSIO_INSTAGRAM_ACCOUNT;
  if (!account || !publication.external_id) throw new Error("Conexão ou Reel do Instagram indisponível.");
  const mediaId = encodeURIComponent(publication.external_id);
  const [insights, media] = await Promise.all([
    composioProxy(account, userId, `https://graph.instagram.com/v21.0/${mediaId}/insights?metric=views,reach,saved,shares,total_interactions,ig_reels_avg_watch_time,ig_reels_video_view_total_time`, "GET"),
    composioProxy(account, userId, `https://graph.instagram.com/v21.0/${mediaId}?fields=like_count,comments_count`, "GET"),
  ]);
  return {
    views: metricFrom(insights, "views"),
    reach: metricFrom(insights, "reach"),
    average_watch_milliseconds: metricFrom(insights, "ig_reels_avg_watch_time"),
    watch_time_milliseconds: metricFrom(insights, "ig_reels_video_view_total_time"),
    likes: numberOrNull(object(media).like_count),
    comments: numberOrNull(object(media).comments_count),
    shares: metricFrom(insights, "shares"),
    saves: metricFrom(insights, "saved"),
    follows: metricFrom(insights, "follows"),
    interactions: metricFrom(insights, "total_interactions"),
    error: null,
  };
}

async function tiktokMetrics(mediaId: string, accountId: string, userId: string): Promise<MetricValues> {
  const fields = "id,view_count,like_count,comment_count,share_count";
  const data = await composioProxy(accountId, userId, `https://open.tiktokapis.com/v2/video/query/?fields=${fields}`, "POST", { filters: { video_ids: [mediaId] } });
  const videos = Array.isArray(object(data).videos) ? object(data).videos as unknown[] : Array.isArray(object(object(data).data).videos) ? object(object(data).data).videos as unknown[] : [];
  const video = videos.map(object)[0];
  if (!video) throw new Error("O TikTok não retornou métricas para este vídeo.");
  return { views: numberOrNull(video.view_count), reach: null, average_watch_milliseconds: null, watch_time_milliseconds: null, likes: numberOrNull(video.like_count), comments: numberOrNull(video.comment_count), shares: numberOrNull(video.share_count), saves: null, follows: null, interactions: null, error: null };
}

function capturedDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function emptyMetrics(error: string): MetricValues {
  return { views: null, reach: null, average_watch_milliseconds: null, watch_time_milliseconds: null, likes: null, comments: null, shares: null, saves: null, follows: null, interactions: null, error };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["de", "a", "o", "as", "os", "em", "para", "com", "que", "do", "da", "dos", "das", "no", "na", "nos", "nas", "um", "uma", "e", "ou", "se", "por", "mais", "nao", "sobre", "apos", "novo", "nova"]);
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

async function saveMetrics(db: ReturnType<typeof getReelAdmin>, postId: string, platform: Platform, metrics: MetricValues, date: string) {
  const { error } = await db.from("reel_social_metrics").upsert({ post_id: postId, platform, captured_on: date, captured_at: new Date().toISOString(), ...metrics }, { onConflict: "post_id,platform,captured_on" });
  return !error;
}

async function saveAccountMetrics(
  db: ReturnType<typeof getReelAdmin>,
  platform: Platform,
  data: { followers: number | null; following?: number | null; total_posts?: number | null; total_views?: number | null; total_likes?: number | null; error?: string | null },
  date: string,
) {
  const { error } = await db.from("reel_account_metrics").upsert({
    platform,
    captured_on: date,
    captured_at: new Date().toISOString(),
    followers: data.followers ?? null,
    following: data.following ?? null,
    total_posts: data.total_posts ?? null,
    total_views: data.total_views ?? null,
    total_likes: data.total_likes ?? null,
    error: data.error ?? null,
  }, { onConflict: "platform,captured_on" });
  return !error;
}

async function mapInBatches<T>(items: T[], batchSize: number, handler: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += batchSize) {
    await Promise.all(items.slice(index, index + batchSize).map(handler));
  }
}

async function youtubeTool(connection: Awaited<ReturnType<typeof getYouTubeConnection>>, tool: string, args: Record<string, Json | undefined>) {
  const result = await callComposio("COMPOSIO_MULTI_EXECUTE_TOOL", {
    session_id: connection.session,
    tools: [{ tool_slug: tool, arguments: args }],
    sync_response_to_workbench: false,
    current_step: "COLLECTING_REEL_METRICS",
  });
  const rows = Array.isArray(result.results) ? result.results : [];
  const response = object(object(rows[0]).response);
  if (response.successful !== true) throw new Error(String(object(response.error).message || "O YouTube não autorizou a consulta de métricas."));
  return object(response.data);
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const db = getReelAdmin();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
  const userId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";
  const { data: publications, error: publicationError } = await db.from("reel_social_publications").select("post_id,platform,status,external_id,platform_media_id").in("status", ["published", "submitted"]).gte("updated_at", since).order("updated_at", { ascending: false }).limit(180);
  const { data: youtubeRows, error: youtubeError } = await db.from("reel_youtube_publications").select("post_id,video_id,tags").eq("status", "uploaded").eq("visibility", "public").not("video_id", "is", null).gte("updated_at", since).order("updated_at", { ascending: false }).limit(60);
  if (publicationError || youtubeError) return NextResponse.json({ error: "Não foi possível consultar os Reels publicados." }, { status: 503 });

  const publishedSocial = (publications || []) as SocialPublication[];
  const tiktokRows = publishedSocial.filter(row => row.platform === "tiktok" && row.external_id);
  const tiktokAccountResponse = process.env.COMPOSIO_API_KEY
    ? await fetch(`https://backend.composio.dev/api/v3.1/connected_accounts?user_uuid=${encodeURIComponent(userId)}`, { headers: { "x-api-key": process.env.COMPOSIO_API_KEY }, cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null)
    : null;
  const tiktokAccountData = tiktokAccountResponse?.ok ? object(await tiktokAccountResponse.json().catch(() => null)) : {};
  const tiktokAccount = (Array.isArray(tiktokAccountData.items) ? tiktokAccountData.items as RecordData[] : []).find(item => (object(item.toolkit).slug === "tiktok" || item.appName === "tiktok") && item.status === "ACTIVE");
  const tiktokAccountId = typeof tiktokAccount?.id === "string" ? tiktokAccount.id : (process.env.COMPOSIO_TIKTOK_ACCOUNT || "");
  const date = capturedDate();
  const rowsToSave: Array<{ postId: string; platform: Platform; metrics: MetricValues }> = [];
  const tiktokBackfills = tiktokRows.filter(row => !row.platform_media_id);

  if (tiktokAccountId && tiktokBackfills.length) {
    await mapInBatches(tiktokBackfills, 3, async publication => {
      try {
        const statusResponse = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
          method: "POST",
          headers: { "x-api-key": process.env.COMPOSIO_API_KEY!, "Content-Type": "application/json" },
          body: JSON.stringify({ connected_account_id: tiktokAccountId, user_id: userId, endpoint: "https://open.tiktokapis.com/v2/post/publish/status/fetch/", method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: { publish_id: publication.external_id } }),
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        });
        const raw = await statusResponse.text();
        const parsed = (() => { try { return JSON.parse(raw); } catch { return null; } })();
        const result = parsed?.data?.data || parsed?.data;
        const ids = raw.match(/"publica[a-z]*_available_post_id"\s*:\s*\[([^\]]*)\]/i)?.[1] || "";
        const mediaId = [...ids.matchAll(/"?(\d{15,25})"?/g)].map(match => match[1])[0];
        if (statusResponse.ok && result?.status === "PUBLISH_COMPLETE" && mediaId) {
          const { error } = await db.from("reel_social_publications").update({ platform_media_id: mediaId, status: "published", updated_at: new Date().toISOString() }).eq("post_id", publication.post_id).eq("platform", "tiktok");
          if (!error) {
            publication.platform_media_id = mediaId;
            publication.status = "published";
          }
        }
      } catch {}
    });

    const stillMissing = tiktokRows.filter(row => !row.platform_media_id);
    if (stillMissing.length) {
      try {
        const listData1 = await composioProxy(tiktokAccountId, userId, "https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time", "POST", { max_count: 20 });
        const dataObj1 = object(listData1);
        const videos1 = (Array.isArray(dataObj1.videos) ? dataObj1.videos as unknown[] : []).map(object);
        let allVideos = [...videos1];
        if (dataObj1.has_more && dataObj1.cursor) {
          const listData2 = await composioProxy(tiktokAccountId, userId, "https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time", "POST", { max_count: 20, cursor: dataObj1.cursor });
          const videos2 = (Array.isArray(object(listData2).videos) ? object(listData2).videos as unknown[] : []).map(object);
          allVideos = [...allVideos, ...videos2];
        }
        if (allVideos.length) {
          const { data: posts } = await db.from("posts").select("id,title,slug,summary").in("id", stillMissing.map(item => item.post_id));
          const postList = posts || [];
          for (const publication of stillMissing) {
            const post = postList.find(p => p.id === publication.post_id);
            if (!post) continue;
            const pWords = extractKeywords(`${post.title} ${post.summary || ""} ${post.slug}`);
            let bestVideo: RecordData | null = null;
            let bestScore = 0;
            for (const video of allVideos) {
              const vWords = new Set(extractKeywords(String(video.title || "")));
              let matchCount = 0;
              for (const word of pWords) {
                if (vWords.has(word)) matchCount++;
              }
              if (matchCount > bestScore) {
                bestScore = matchCount;
                bestVideo = video;
              }
            }
            if (bestVideo && bestScore >= 10 && typeof bestVideo.id === "string") {
              const { error } = await db.from("reel_social_publications").update({ platform_media_id: bestVideo.id, status: "published", updated_at: new Date().toISOString() }).eq("post_id", publication.post_id).eq("platform", "tiktok");
              if (!error) {
                publication.platform_media_id = bestVideo.id;
                publication.status = "published";
              }
            }
          }
        }
      } catch {}
    }
  }

  const instagramAccount = process.env.COMPOSIO_INSTAGRAM_ACCOUNT;
  if (instagramAccount) {
    try {
      const profile = await composioProxy(instagramAccount, userId, "https://graph.instagram.com/v21.0/me?fields=id,username,followers_count,media_count", "GET");
      const followers = numberOrNull(object(profile).followers_count);
      const totalPosts = numberOrNull(object(profile).media_count);
      await saveAccountMetrics(db, "instagram", { followers, total_posts: totalPosts }, date);
    } catch (error) {
      await saveAccountMetrics(db, "instagram", { followers: null, error: error instanceof Error ? error.message : "Falha ao consultar perfil do Instagram." }, date);
    }
  }

  if (tiktokAccountId) {
    try {
      const userInfo = await composioProxy(tiktokAccountId, userId, "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count", "GET");
      const user = object(object(userInfo).user || object(object(userInfo).data).user);
      const followers = numberOrNull(user.follower_count);
      const following = numberOrNull(user.following_count);
      const totalLikes = numberOrNull(user.likes_count);
      const totalPosts = numberOrNull(user.video_count);
      await saveAccountMetrics(db, "tiktok", { followers, following, total_posts: totalPosts, total_likes: totalLikes }, date);
    } catch (error) {
      await saveAccountMetrics(db, "tiktok", { followers: null, error: error instanceof Error ? error.message : "Falha ao consultar perfil do TikTok." }, date);
    }
  }

  const socialTasks = publishedSocial.filter(row => row.platform === "instagram" || (row.platform === "tiktok" && row.platform_media_id));
  await mapInBatches(socialTasks, 4, async publication => {
    try {
      const metrics = publication.platform === "instagram"
        ? await instagramMetrics(publication, userId)
        : publication.platform_media_id && tiktokAccountId
          ? await tiktokMetrics(publication.platform_media_id, tiktokAccountId, userId)
          : null;
      if (metrics) rowsToSave.push({ postId: publication.post_id, platform: publication.platform, metrics });
      else if (publication.platform === "tiktok") rowsToSave.push({ postId: publication.post_id, platform: publication.platform, metrics: emptyMetrics("O vídeo ainda não foi finalizado no TikTok ou não tem ID público.") });
    } catch (error) {
      rowsToSave.push({ postId: publication.post_id, platform: publication.platform, metrics: emptyMetrics(error instanceof Error ? error.message : "Falha ao consultar as métricas da rede.") });
    }
  });

  let youtubeConnection: Awaited<ReturnType<typeof getYouTubeConnection>> | null = null;
  let youtubeConnectionError: string | null = null;
  if (youtubeRows?.length) {
    try { youtubeConnection = await getYouTubeConnection(true); }
    catch (error) { youtubeConnectionError = error instanceof Error ? error.message : "Conexão do YouTube indisponível."; }
  }
  const youtube = (youtubeRows || []) as YouTubePublication[];
  if (youtube.length && youtubeConnection) {
    try {
      const channelStatsRes = await youtubeTool(youtubeConnection, "YOUTUBE_GET_CHANNEL_STATISTICS", { mine: true, part: "statistics" });
      const channels = Array.isArray(channelStatsRes.channels) ? channelStatsRes.channels : Array.isArray(channelStatsRes.items) ? channelStatsRes.items : [];
      const channelObj = channels.map(object).find(item => item.id === youtubeConnection?.channel.id) || object(channels[0]);
      const channelStats = object(channelObj.statistics);
      const followers = numberOrNull(channelStats.subscriberCount);
      const totalViews = numberOrNull(channelStats.viewCount);
      const totalPosts = numberOrNull(channelStats.videoCount);
      await saveAccountMetrics(db, "youtube", { followers, total_views: totalViews, total_posts: totalPosts }, date);
    } catch (error) {
      await saveAccountMetrics(db, "youtube", { followers: null, error: error instanceof Error ? error.message : "Falha ao consultar canal do YouTube." }, date);
    }

    const videoIds = youtube.map(publication => publication.video_id);
    const videosById = new Map<string, RecordData>();
    let youtubeDetailsError: string | null = null;
    try {
      for (let index = 0; index < videoIds.length; index += 5) {
        const batch = videoIds.slice(index, index + 5);
        try {
          const details = await youtubeTool(youtubeConnection, "YOUTUBE_GET_VIDEO_DETAILS_BATCH", { id: batch, parts: ["snippet", "statistics"] });
          const videos = (Array.isArray(details.items) ? details.items as RecordData[] : Array.isArray(details.videos) ? details.videos as RecordData[] : []).map(object);
          for (const video of videos) if (typeof video.id === "string") videosById.set(video.id, video);
        } catch (error) {
          youtubeDetailsError = error instanceof Error ? error.message : "Falha ao consultar lote do YouTube.";
        }
      }
    } catch (error) {
      youtubeDetailsError = error instanceof Error ? error.message : "Falha ao consultar o YouTube.";
    }

    const youtubePostIds = youtube.map(publication => publication.post_id);
    const [{ data: posts }, { data: jobs }] = await Promise.all([
      db.from("posts").select("id,slug,title,summary,category").in("id", youtubePostIds),
      db.from("reel_jobs").select("post_id,script,created_at").in("post_id", youtubePostIds).eq("status", "ready").order("created_at", { ascending: false }),
    ]);
    const postById = new Map((posts || []).map(post => [post.id, post]));
    const scriptByPostId = new Map<string, unknown>();
    for (const job of jobs || []) if (!scriptByPostId.has(job.post_id)) scriptByPostId.set(job.post_id, job.script);
    const tagChecks: Array<{ postId: string; match: boolean }> = [];
    for (const publication of youtube) {
      const video = videosById.get(publication.video_id);
      if (!video && youtubeDetailsError) {
        rowsToSave.push({ postId: publication.post_id, platform: "youtube", metrics: emptyMetrics(youtubeDetailsError) });
        continue;
      }
      if (!video) continue;
      const actualTags = Array.isArray(object(video.snippet).tags) ? object(video.snippet).tags as string[] : [];
      const post = postById.get(publication.post_id);
      const script = scriptByPostId.get(publication.post_id);
      const expectedTags = publication.tags?.length ? publication.tags : post ? generateSocialCopys({ ...post, script: script as ReelScriptData | null }).youtube.tags : [];
      if (expectedTags.length) {
        const normalize = (tags: string[]) => [...new Set(tags.map(tag => tag.trim().toLocaleLowerCase("pt-BR")))].sort();
        const match = JSON.stringify(normalize(expectedTags)) === JSON.stringify(normalize(actualTags));
        await db.from("reel_youtube_publications").update({ verified_tags: actualTags, tags_verified_at: new Date().toISOString(), tags_match: match }).eq("post_id", publication.post_id).eq("video_id", publication.video_id);
        tagChecks.push({ postId: publication.post_id, match });
      }
      const statistics = object(video.statistics);
      rowsToSave.push({ postId: publication.post_id, platform: "youtube", metrics: { views: numberOrNull(statistics.viewCount), reach: null, average_watch_milliseconds: null, watch_time_milliseconds: null, likes: numberOrNull(statistics.likeCount), comments: numberOrNull(statistics.commentCount), shares: null, saves: null, follows: null, interactions: null, error: null } });
    }

    if (youtubeConnection && videoIds.length) {
      const endDate = new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString().slice(0, 10);
      try {
        const analytics = await youtubeTool(youtubeConnection, "YOUTUBE_QUERY_ANALYTICS", { ids: `channel==${youtubeConnection.channel.id}`, startDate, endDate, metrics: "views,averageViewDuration,subscribersGained,shares", dimensions: "video", filters: `video==${videoIds.join(",")}` });
        const headers = Array.isArray(analytics.columnHeaders) ? analytics.columnHeaders as RecordData[] : [];
        const analyticsRows = Array.isArray(analytics.rows) ? analytics.rows as unknown[][] : [];
        const analyticsByVideo = new Map<string, RecordData>();
        for (const values of analyticsRows) {
          const record = Object.fromEntries(headers.map((header, index) => [String(header.name), values[index]]));
          if (typeof record.video === "string") analyticsByVideo.set(record.video, record);
        }
        for (const publication of youtube) {
          const row = rowsToSave.find(item => item.postId === publication.post_id && item.platform === "youtube");
          const record = analyticsByVideo.get(publication.video_id);
          if (!row || !record) continue;
          const averageViewDuration = numberOrNull(record.averageViewDuration);
          row.metrics = { ...row.metrics, average_watch_milliseconds: averageViewDuration === null ? null : averageViewDuration * 1000, follows: numberOrNull(record.subscribersGained), shares: numberOrNull(record.shares) };
        }
      } catch {}
    }

    const tagMismatches = tagChecks.filter(check => !check.match).map(check => check.postId);
    const result = await saveRows(db, rowsToSave, date);
    return NextResponse.json({ capturedOn: date, ...result, checked: rowsToSave.length, tiktokAccountAvailable: Boolean(tiktokAccountId), youtubeConnected: Boolean(youtubeConnection), tagsChecked: tagChecks.length, tagMismatches }, { headers: { "Cache-Control": "no-store" } });
  } else if (youtubeConnectionError) {
    for (const publication of youtube) rowsToSave.push({ postId: publication.post_id, platform: "youtube", metrics: emptyMetrics(youtubeConnectionError) });
  }

  const result = await saveRows(db, rowsToSave, date);
  return NextResponse.json({ capturedOn: date, ...result, checked: rowsToSave.length, tiktokAccountAvailable: Boolean(tiktokAccountId), youtubeConnected: Boolean(youtubeConnection), tagsChecked: 0, tagMismatches: [] }, { headers: { "Cache-Control": "no-store" } });
}

async function saveRows(db: ReturnType<typeof getReelAdmin>, rows: Array<{ postId: string; platform: Platform; metrics: MetricValues }>, date: string) {
  let saved = 0;
  let failed = 0;
  for (const row of rows) {
    if (await saveMetrics(db, row.postId, row.platform, row.metrics, date)) saved++;
    else failed++;
  }
  return { saved, failed };
}
