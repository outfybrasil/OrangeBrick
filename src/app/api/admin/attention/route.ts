import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { buildAdminAttention, type AttentionPost, type AttentionReview, type AttentionVideo, type AttentionPublication } from "@/lib/admin-attention";
import { inspectPublicationImagesInDatabase } from "@/lib/server/manual-publication-images";
import { getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: { user }, error } = await createPublicServerClient().auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const client = createServiceDataClient();
  const scan = new URL(request.url).searchParams.get("images") === "1";
  if (scan) {
    const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", { p_action: "admin_image_scan", p_identity_hash: user.id, p_window_start: getRateLimitWindowStart(new Date(), 60_000).toISOString(), p_limit: 1 });
    if (rateError || !allowed) return NextResponse.json({ error: "Aguarde um minuto antes de conferir as imagens novamente." }, { status: 429 });
  }
  const signal = AbortSignal.timeout(8000);
  const [posts, reviews, videos, publications] = await Promise.all([
    client.from("posts").select("id,title,summary,body,image_url,image_alt,is_published,updated_at").is("archived_at", null).order("updated_at", { ascending: false }).limit(50).abortSignal(signal),
    client.from("editorial_review_jobs").select("id,post_id,status,expected_updated_at,finished_at,report").order("created_at", { ascending: false }).limit(150).abortSignal(signal),
    client.from("reel_jobs").select("id,post_id,status").order("created_at", { ascending: false }).limit(150).abortSignal(signal),
    client.from("reel_youtube_publications").select("id,post_id,status").order("created_at", { ascending: false }).limit(150).abortSignal(signal),
  ]);
  if (posts.error) return NextResponse.json({ error: "Não foi possível carregar as pendências." }, { status: 503 });
  const recentPosts = (posts.data || []) as AttentionPost[];
  const checked = scan ? await inspectPublicationImagesInDatabase(recentPosts.slice(0, 6), client) : undefined;
  const warnings = [reviews.error && "Não foi possível consultar as revisões.", videos.error && "Não foi possível consultar os vídeos.", publications.error && "Não foi possível consultar os envios ao YouTube."].filter(Boolean);
  return NextResponse.json({
    items: buildAdminAttention(recentPosts, (reviews.data || []) as AttentionReview[], (videos.data || []) as AttentionVideo[], (publications.data || []) as AttentionPublication[], checked),
    warnings,
    checkedAt: new Date().toISOString(),
    scanned: scan ? Math.min(6, recentPosts.length) : 0,
    total: recentPosts.length,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
