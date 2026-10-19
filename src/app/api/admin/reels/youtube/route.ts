import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import type { ReelJob, ReelYouTubePublication } from "@/lib/types/database";
import { getReelAdmin, REEL_BUCKET } from "@/lib/video/reel-remote";
import { getYouTubeConnection, stageYouTubeVideo, uploadYouTubeVideo } from "@/lib/video/reel-youtube";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user }, error } = await getReelAdmin().auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token);
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function publicationHistory(postId: string, channelId: string) {
  const db = getReelAdmin();
  const { data, error } = await db.from("reel_youtube_publications").select("*").eq("post_id", postId).eq("channel_id", channelId).maybeSingle();
  if (error) throw new Error("Não foi possível consultar o histórico de envios.");
  const publication = data as ReelYouTubePublication | null;
  if (!publication || !["preparing", "uploading"].includes(publication.status) || Date.now() - Date.parse(publication.updated_at) < 10 * 60_000) return publication;
  const patch = publication.status === "preparing"
    ? { status: "failed", error: "A preparação foi interrompida antes do envio. Tente novamente." }
    : { status: "unknown", error: "O envio não foi confirmado. Confira o YouTube Studio antes de repetir." };
  const { data: recovered, error: recoveryError } = await db.from("reel_youtube_publications")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", publication.id)
    .eq("status", publication.status).eq("updated_at", publication.updated_at).select("*").maybeSingle();
  if (recoveryError) throw new Error("Não foi possível atualizar o histórico de envios.");
  return (recovered as ReelYouTubePublication | null) || publication;
}

export async function GET(request: Request) {
  try {
    if (!await authorized(request)) return reply({ error: "Faça login como administrador e confirme a autenticação em duas etapas." }, 403);
    const postId = new URL(request.url).searchParams.get("postId");
    if (!postId || !uuid.test(postId)) return reply({ error: "Matéria inválida." }, 400);
    const connection = await getYouTubeConnection();
    const data = await publicationHistory(postId, connection.channel.id);
    return reply({ channel: connection.channel, publication: data });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Não foi possível conectar ao YouTube." }, 503);
  }
}

export async function POST(request: Request) {
  let publicationId: string | undefined;
  let uploadStarted = false;
  let videoId: string | undefined;
  try {
    const automatic = isAuthorizedCronRequest(request);
    if (!automatic && !await authorized(request)) return reply({ error: "Faça login como administrador e confirme a autenticação em duas etapas." }, 403);
    const body = await request.json().catch(() => null);
    if (!body || automatic && body.autoPublic !== true || typeof body.postId !== "string" || !uuid.test(body.postId) || body.confirmed !== true
      || typeof body.reelJobId !== "string" || !uuid.test(body.reelJobId)
      || typeof body.title !== "string" || !body.title.trim() || body.title.length > 100 || /[<>]/.test(body.title)
      || typeof body.description !== "string" || body.description.length > 5000 || /[<>]/.test(body.description)
      || !["private", "unlisted", "public"].includes(body.visibility)) {
      return reply({ error: "Revise o título (até 100 caracteres), a descrição (até 5.000) e confirme o envio. Não use os caracteres < e >." }, 400);
    }
    const connection = await getYouTubeConnection(true);
    if (body.channelId !== connection.channel.id) return reply({ error: "O canal de destino mudou. Atualize a conexão antes de enviar." }, 409);
    const db = getReelAdmin();
    const { data: jobData, error: jobError } = await db.from("reel_jobs").select("*").eq("post_id", body.postId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const job = jobData as ReelJob | null;
    if (jobError || !job || job.status !== "ready" || !job.storage_path) return reply({ error: "Aguarde o Reel ficar pronto antes de enviar." }, 409);
    if (body.reelJobId !== job.id) return reply({ error: "O Reel foi atualizado. Abra novamente a prévia e revise o vídeo antes de enviar." }, 409);
    const existing = await publicationHistory(body.postId, connection.channel.id);
    if (existing && ["preparing", "uploading"].includes(existing.status)) {
      return reply({ error: "O envio deste Reel já está em andamento. Aguarde.", publication: existing }, 409);
    }
    if (existing && existing.status !== "failed" && !body.repost) {
      return reply({ error: "Este Reel já foi enviado ou tem um envio em andamento. Confira o histórico antes de repetir.", publication: existing }, 409);
    }
    const record = { post_id: body.postId, reel_job_id: job.id, channel_id: connection.channel.id, status: "preparing", title: body.title.trim(), description: body.description, visibility: body.visibility, error: null, updated_at: new Date().toISOString() };
    const claim = existing
      ? await db.from("reel_youtube_publications").update(record).eq("id", existing.id).select("id").maybeSingle()
      : await db.from("reel_youtube_publications").insert(record).select("id").single();
    if (claim.error || !claim.data) return reply({ error: "Não foi possível reservar o envio. Atualize o histórico para evitar duplicação." }, 409);
    publicationId = claim.data.id;
    const { data: signed, error: signError } = await db.storage.from(REEL_BUCKET).createSignedUrl(job.storage_path, 900);
    if (signError || !signed) throw new Error("O vídeo não está disponível no armazenamento.");
    const file = await stageYouTubeVideo(connection.session, signed.signedUrl, job.id);
    const { error: markError } = await db.from("reel_youtube_publications").update({ status: "uploading", updated_at: new Date().toISOString() }).eq("id", publicationId);
    if (markError) throw new Error("Não foi possível registrar o início do envio.");
    uploadStarted = true;
    videoId = await uploadYouTubeVideo(connection, file, record.title, record.description, record.visibility);
    const { data: saved, error: saveError } = await db.from("reel_youtube_publications").update({ status: "uploaded", video_id: videoId, updated_at: new Date().toISOString() }).eq("id", publicationId).select("*").single();
    if (saveError) throw new Error("O vídeo foi recebido pelo YouTube, mas o histórico não pôde ser atualizado.");
    return reply({ publication: saved as ReelYouTubePublication });
  } catch (error) {
    const message = uploadStarted
      ? "O envio pode ter sido recebido pelo YouTube. Confira o YouTube Studio antes de tentar novamente."
      : error instanceof Error ? error.message : "Não foi possível preparar o envio.";
    if (publicationId) {
      await getReelAdmin().from("reel_youtube_publications").update({ status: videoId ? "uploaded" : uploadStarted ? "unknown" : "failed", video_id: videoId || null, error: message, updated_at: new Date().toISOString() }).eq("id", publicationId);
    }
    return reply({ error: message, videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined }, 503);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!await authorized(request)) return reply({ error: "Faça login como administrador para acessar." }, 403);
    const postId = new URL(request.url).searchParams.get("postId");
    if (!postId || !uuid.test(postId)) return reply({ error: "Matéria inválida." }, 400);
    const connection = await getYouTubeConnection();
    const db = getReelAdmin();
    const { error } = await db.from("reel_youtube_publications").delete().eq("post_id", postId).eq("channel_id", connection.channel.id);
    if (error) throw new Error("Não foi possível redefinir o histórico de envio.");
    return reply({ success: true, message: "Histórico de envio redefinido com sucesso." });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Erro ao resetar histórico." }, 500);
  }
}
