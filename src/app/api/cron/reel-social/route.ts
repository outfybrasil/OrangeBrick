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

const platforms: Platform[] = ["instagram", "tiktok", "youtube"];

async function platformRequest(platform: Platform, body: Record<string, unknown>) {
  const response = await fetch(new URL(`/api/admin/reels/${platform}`, getSiteUrl()), {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, autoPublic: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(220_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(typeof result?.error === "string" ? result.error : `A rede ${platform} não confirmou o envio.`), { httpStatus: response.status });
  return result;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const db = getReelAdmin();
  const { data: activation, error: activationError } = await db.from("reel_social_automation").select("activated_at").eq("id", true).single();
  if (activationError || !activation) return NextResponse.json({ error: "Automação de redes ainda não foi instalada." }, { status: 503 });
  await db.from("reel_social_publications").update({ status: "unknown", error: "O envio foi interrompido. Confira a rede antes de repetir.", updated_at: new Date().toISOString() }).eq("status", "processing").lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString());

  const { data: submitted, error: submittedError } = await db.from("reel_social_publications").select("post_id,platform,status,external_id").eq("platform", "tiktok").eq("status", "submitted").order("updated_at", { ascending: true }).limit(1);
  if (submittedError) return NextResponse.json({ error: "Não foi possível ler os envios às redes." }, { status: 503 });
  const pending = submitted?.[0] as Delivery | undefined;
  if (pending?.external_id) {
    try {
      const statusUrl = new URL("/api/admin/reels/tiktok", getSiteUrl());
      statusUrl.searchParams.set("action", "status");
      statusUrl.searchParams.set("publishId", pending.external_id);
      const response = await fetch(statusUrl, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, cache: "no-store", signal: AbortSignal.timeout(40_000) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "O TikTok não confirmou o estado do vídeo.");
      const status = result.status === "PUBLISH_COMPLETE" ? "published" : result.status === "FAILED" ? "failed" : "submitted";
      await db.from("reel_social_publications").update({ status, error: status === "failed" ? String(result.reason || "O TikTok recusou a publicação.") : null, updated_at: new Date().toISOString() }).eq("post_id", pending.post_id).eq("platform", "tiktok").eq("status", "submitted");
      if (status !== "submitted") return NextResponse.json({ postId: pending.post_id, platform: "tiktok", status });
    } catch (error) {
      return NextResponse.json({ postId: pending.post_id, platform: "tiktok", status: "submitted", warning: error instanceof Error ? error.message : "Falha ao consultar o TikTok." });
    }
  }

  const { data: jobs, error: jobsError } = await db.from("reel_jobs").select("*").eq("status", "ready").gte("created_at", activation.activated_at).order("created_at", { ascending: true }).limit(50);
  if (jobsError || !jobs?.length) return NextResponse.json({ processed: false, error: jobsError?.message });
  const postIds = [...new Set(jobs.map((job) => job.post_id as string))];
  const [postsResult, deliveriesResult] = await Promise.all([
    db.from("posts").select("id,slug,title,summary,category,is_published,published_at,updated_at,archived_at").in("id", postIds),
    db.from("reel_social_publications").select("post_id,platform,status,external_id").in("post_id", postIds),
  ]);
  if (postsResult.error || deliveriesResult.error) return NextResponse.json({ error: "Não foi possível conferir as publicações." }, { status: 503 });
  const posts = new Map(((postsResult.data || []) as Post[]).map((post) => [post.id, post]));
  const deliveries = new Set(((deliveriesResult.data || []) as Delivery[]).map((row) => `${row.post_id}:${row.platform}`));

  for (const job of jobs as ReelJob[]) {
    const post = posts.get(job.post_id);
    if (!post?.is_published || post.archived_at || !post.published_at || post.published_at < activation.activated_at || post.updated_at !== job.expected_updated_at || !job.storage_path) continue;
    for (const platform of platforms) {
      if (deliveries.has(`${post.id}:${platform}`)) continue;
      if (platform === "youtube") {
        const { data: existing } = await db.from("reel_youtube_publications").select("id").eq("post_id", post.id).limit(1);
        if (existing?.length) continue;
      }
      const { error: claimError } = await db.from("reel_social_publications").insert({ post_id: post.id, platform, reel_job_id: job.id, status: "processing" });
      if (claimError?.code === "23505") continue;
      if (claimError) return NextResponse.json({ error: "Não foi possível reservar o envio às redes." }, { status: 503 });
      try {
        const { data: signed, error: signError } = await db.storage.from(REEL_BUCKET).createSignedUrl(job.storage_path, 3600);
        if (signError || !signed?.signedUrl) throw new Error("O Reel não está disponível no armazenamento.");
        const copy = generateSocialCopys({ title: post.title, summary: post.summary, slug: post.slug, category: post.category, script: job.script as unknown as ReelScriptData | null });
        const body = platform === "instagram"
          ? { postId: post.id, videoUrl: signed.signedUrl, caption: copy.instagram.caption }
          : platform === "tiktok"
            ? { postId: post.id, videoUrl: signed.signedUrl, caption: copy.tiktok.caption, privacyLevel: "PUBLIC_TO_EVERYONE" }
            : { postId: post.id, reelJobId: job.id, channelId: (await getYouTubeConnection()).channel.id, title: copy.youtube.title, description: copy.youtube.description, visibility: "public", confirmed: true };
        const result = await platformRequest(platform, body);
        const externalId = platform === "instagram" ? result.mediaId : platform === "tiktok" ? result.publishId : result.publication?.video_id;
        const status = platform === "tiktok" ? externalId && externalId !== "ok" && result.isDirect === true ? "submitted" : "unknown" : platform === "youtube" ? externalId ? "submitted" : "unknown" : externalId ? "published" : "unknown";
        await db.from("reel_social_publications").update({ status, external_id: externalId || null, error: status === "unknown" ? "O destino não confirmou a publicação pública. Confira a conta antes de repetir." : null, updated_at: new Date().toISOString() }).eq("post_id", post.id).eq("platform", platform).eq("status", "processing");
        return NextResponse.json({ postId: post.id, platform, status });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha desconhecida no envio.";
        const status = error && typeof error === "object" && "httpStatus" in error && error.httpStatus === 409 ? "failed" : "unknown";
        await db.from("reel_social_publications").update({ status, error: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("post_id", post.id).eq("platform", platform).eq("status", "processing");
        return NextResponse.json({ postId: post.id, platform, status, error: message });
      }
    }
  }
  return NextResponse.json({ processed: false });
}
