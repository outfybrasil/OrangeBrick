import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { getSiteUrl } from "@/lib/site-url";
import { getReelAdmin, REEL_BUCKET } from "@/lib/video/reel-remote";
import { generateSocialCopys } from "@/lib/video/reel-service";
import { getYouTubeConnection } from "@/lib/video/reel-youtube";
import type { ReelScriptData } from "@/lib/video/reel-script";
import type { Post, ReelJob } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Platform = "instagram" | "tiktok" | "youtube";
type Delivery = { post_id: string; platform: Platform; status: string; external_id: string | null };
type ReelAdmin = ReturnType<typeof getReelAdmin>;

const platforms: Platform[] = ["youtube", "instagram", "tiktok"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function platformRequest(platform: Platform, body: Record<string, unknown>) {
  const response = await fetch(new URL(`/api/admin/reels/${platform}`, getSiteUrl()), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, autoPublic: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(220_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(typeof result?.error === "string" ? result.error : `A rede ${platform} não confirmou o envio.`), { httpStatus: response.status, deliveryStatus: result?.deliveryStatus });
  return result;
}

function pickPost(post: Post | undefined, job: ReelJob, activatedAt?: string) {
  if (!post?.is_published || post.archived_at || !post.published_at || post.updated_at !== job.expected_updated_at) return undefined;
  if (activatedAt && post.published_at < activatedAt) return undefined;
  return post;
}

async function publishPlatform(db: ReelAdmin, post: Post, job: ReelJob, platform: Platform, storagePath: string) {
  try {
    const { data: signed, error: signError } = await db.storage.from(REEL_BUCKET).createSignedUrl(storagePath, 3600);
    if (signError || !signed?.signedUrl) throw new Error("O Reel não está disponível no armazenamento.");
    const copy = generateSocialCopys({ title: post.title, summary: post.summary, slug: post.slug, category: post.category, script: job.script as unknown as ReelScriptData | null });
    const body = platform === "instagram"
      ? { postId: post.id, videoUrl: signed.signedUrl, caption: copy.instagram.caption }
      : platform === "tiktok"
        ? { postId: post.id, videoUrl: signed.signedUrl, caption: copy.tiktok.caption }
        : { postId: post.id, reelJobId: job.id, channelId: (await getYouTubeConnection()).channel.id, title: copy.youtube.title, description: copy.youtube.description, visibility: "public", confirmed: true };
    const result = await platformRequest(platform, body);
    const externalId = platform === "instagram" ? result.mediaId : platform === "tiktok" ? result.publishId : result.publication?.video_id;
    const youtubePublication = platform === "youtube" ? result.publication as { status?: string; visibility?: string } | undefined : undefined;
    const status = platform === "tiktok"
      ? externalId && externalId !== "ok" ? "submitted" : "unknown"
      : platform === "youtube"
        ? youtubePublication?.status === "uploaded" ? youtubePublication.visibility === "public" ? "published" : "submitted"
          : youtubePublication?.status === "preparing" || youtubePublication?.status === "uploading" ? "processing"
            : youtubePublication?.status === "failed" ? "failed" : "unknown"
        : externalId ? "published" : "unknown";
    return { claimed: true as const, status, error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida no envio.";
    if (error && typeof error === "object" && "httpStatus" in error && error.httpStatus === 409) return { claimed: false as const };
    const status = error && typeof error === "object" && "deliveryStatus" in error && error.deliveryStatus === "failed" ? "failed" : "unknown";
    return { claimed: true as const, status, error: message };
  }
}

async function pollTikTokStatus(db: ReelAdmin, postId?: string): Promise<{ postId: string; status: string } | { postId: string; warning: string } | null> {
  let query = db.from("reel_social_publications").select("post_id,platform,status,external_id").eq("platform", "tiktok").eq("status", "submitted").order("updated_at", { ascending: true }).limit(1);
  if (postId) query = query.eq("post_id", postId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível ler os envios às redes.");
  const pending = data?.[0] as Delivery | undefined;
  if (!pending?.external_id) return null;
  try {
    const statusUrl = new URL("/api/admin/reels/tiktok", getSiteUrl());
    statusUrl.searchParams.set("action", "status");
    statusUrl.searchParams.set("publishId", pending.external_id);
    const response = await fetch(statusUrl, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, cache: "no-store", signal: AbortSignal.timeout(40_000) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || "O TikTok não confirmou o estado do vídeo.");
    const status = result.status === "PUBLISH_COMPLETE" ? "published" : result.status === "FAILED" ? "failed" : "submitted";
    await db.from("reel_social_publications").update({ status, error: status === "failed" ? String(result.reason || "O TikTok recusou a publicação.") : null, updated_at: new Date().toISOString() }).eq("post_id", pending.post_id).eq("platform", "tiktok").eq("status", "submitted");
    if (status === "submitted") return null;
    return { postId: pending.post_id, status };
  } catch (error) {
    return { postId: pending.post_id, warning: error instanceof Error ? error.message : "Falha ao consultar o TikTok." };
  }
}

async function publishNext(db: ReelAdmin, jobs: ReelJob[], activatedAt?: string) {
  const postIds = [...new Set(jobs.map((job) => job.post_id))];
  const [postsResult, deliveriesResult] = await Promise.all([
    db.from("posts").select("id,slug,title,summary,category,is_published,published_at,updated_at,archived_at").in("id", postIds),
    db.from("reel_social_publications").select("post_id,platform,status,external_id").in("post_id", postIds),
  ]);
  if (postsResult.error || deliveriesResult.error) return NextResponse.json({ error: "Não foi possível conferir as publicações." }, { status: 503 });
  const posts = new Map(((postsResult.data || []) as Post[]).map((post) => [post.id, post]));
  const deliveries = new Map(((deliveriesResult.data || []) as Delivery[]).map((row) => [`${row.post_id}:${row.platform}`, row]));

  for (const job of jobs) {
    const storagePath = job.storage_path;
    if (!storagePath) continue;
    const post = pickPost(posts.get(job.post_id), job, activatedAt);
    if (!post) continue;
    const activeDelivery = platforms.map(platform => deliveries.get(`${post.id}:${platform}`)).find(delivery => delivery?.status === "processing");
    if (activeDelivery) return NextResponse.json({ processed: false, postId: post.id, platform: activeDelivery.platform, status: "processing" });
    for (const platform of platforms) {
      const delivery = deliveries.get(`${post.id}:${platform}`);
      if (delivery) continue;
      if (platform === "youtube") {
        const { data: existing } = await db.from("reel_youtube_publications").select("id,status").eq("post_id", post.id).limit(1);
        if (existing?.some((row) => row.status === "preparing" || row.status === "uploading")) return NextResponse.json({ processed: false, postId: post.id, platform, status: "processing" });
        if (existing?.length) continue;
      }
      const outcome = await publishPlatform(db, post, job, platform, storagePath);
      if (!outcome.claimed) {
        return NextResponse.json({ processed: false, postId: post.id, platform, status: "processing" });
      }
      return NextResponse.json({ postId: post.id, platform, status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}) });
    }
  }
  return null;
}

async function batchPublish(db: ReelAdmin, activatedAt: string) {
  const { data: jobs, error: jobsError } = await db.from("reel_jobs").select("*").eq("status", "ready").gte("created_at", activatedAt).order("created_at", { ascending: true }).limit(50);
  if (jobsError) return NextResponse.json({ error: "Não foi possível consultar a fila de Reels." }, { status: 503 });
  const result = jobs?.length ? await publishNext(db, jobs as ReelJob[], activatedAt) : null;
  if (result) return result;
  const poll = await pollTikTokStatus(db);
  if (poll) {
    if ("warning" in poll) return NextResponse.json({ postId: poll.postId, platform: "tiktok", status: "submitted", warning: poll.warning });
    return NextResponse.json({ postId: poll.postId, platform: "tiktok", status: poll.status });
  }
  return NextResponse.json({ processed: false });
}

async function targetedPublish(db: ReelAdmin, postId: string, jobId: string | null) {
  let query = db.from("reel_jobs").select("*").eq("status", "ready").order("created_at", { ascending: false }).limit(1);
  query = jobId ? query.eq("id", jobId) : query.eq("post_id", postId);
  const { data: jobs, error: jobsError } = await query;
  if (jobsError) return NextResponse.json({ error: "Não foi possível ler a fila de Reels." }, { status: 503 });
  const job = jobs?.[0] as ReelJob | undefined;
  if (!job || job.post_id !== postId) return NextResponse.json({ processed: false, postId });

  const { data: postData, error: postError } = await db.from("posts").select("id,slug,title,summary,category,is_published,published_at,updated_at,archived_at").eq("id", postId).single();
  if (postError || !postData) return NextResponse.json({ error: "Não foi possível conferir a matéria." }, { status: 503 });
  const post = pickPost(postData as Post, job);
  const storagePath = job.storage_path;
  if (!post || !storagePath) return NextResponse.json({ processed: false, postId });

  const { data: deliveriesData, error: deliveriesError } = await db.from("reel_social_publications").select("post_id,platform,status,external_id").eq("post_id", postId);
  if (deliveriesError) return NextResponse.json({ error: "Não foi possível conferir as publicações." }, { status: 503 });
  const deliveries = new Map(((deliveriesData || []) as Delivery[]).map((row) => [`${row.post_id}:${row.platform}`, row]));
  const activeDelivery = platforms.map(platform => deliveries.get(`${post.id}:${platform}`)).find(delivery => delivery?.status === "processing");
  if (activeDelivery) return NextResponse.json({ processed: false, postId: post.id, platform: activeDelivery.platform, status: "processing" });

  for (const platform of platforms) {
    const delivery = deliveries.get(`${post.id}:${platform}`);
    if (delivery) continue;
    if (platform === "youtube") {
      const { data: existing } = await db.from("reel_youtube_publications").select("id,status").eq("post_id", post.id).limit(1);
      if (existing?.some((row) => row.status === "preparing" || row.status === "uploading")) return NextResponse.json({ processed: false, postId: post.id, platform, status: "processing" });
      if (existing?.length) continue;
    }
    const outcome = await publishPlatform(db, post, job, platform, storagePath);
    if (!outcome.claimed) {
      return NextResponse.json({ processed: false, postId: post.id, platform, status: "processing" });
    }
    return NextResponse.json({ postId: post.id, platform, status: outcome.status, ...(outcome.error ? { error: outcome.error } : {}) });
  }

  const poll = await pollTikTokStatus(db, postId);
  if (poll) {
    if ("warning" in poll) return NextResponse.json({ processed: false, postId: poll.postId, platform: "tiktok", status: "submitted", warning: poll.warning });
    return NextResponse.json({ processed: false, postId: poll.postId, platform: "tiktok", status: poll.status });
  }
  const { data: pendingTikTok, error: pendingTikTokError } = await db.from("reel_social_publications").select("external_id").eq("post_id", postId).eq("platform", "tiktok").eq("status", "submitted").maybeSingle();
  if (pendingTikTokError) return NextResponse.json({ error: "Não foi possível consultar a confirmação do TikTok." }, { status: 503 });
  if (pendingTikTok?.external_id) return NextResponse.json({ processed: false, postId, platform: "tiktok", status: pendingTikTok.external_id.startsWith("v_inbox_") ? "draft" : "submitted" });
  return NextResponse.json({ processed: false, postId });
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const db = getReelAdmin();
  const { data: activation, error: activationError } = await db.from("reel_social_automation").select("activated_at").eq("id", true).single();
  if (activationError || !activation) return NextResponse.json({ error: "Automação de redes ainda não foi instalada." }, { status: 503 });
  await db.from("reel_social_publications").update({ status: "unknown", error: "O envio foi interrompido. Confira a rede antes de repetir.", updated_at: new Date().toISOString() }).eq("status", "processing").lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());

  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  const jobId = url.searchParams.get("jobId");
  if ((postId && !uuidPattern.test(postId)) || (jobId && !uuidPattern.test(jobId))) return NextResponse.json({ error: "Identificador de Reel inválido." }, { status: 400 });
  if (postId) return targetedPublish(db, postId, jobId);
  return batchPublish(db, activation.activated_at as string);
}
