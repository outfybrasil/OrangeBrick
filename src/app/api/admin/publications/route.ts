import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { readResponseBuffer } from "@/lib/server/network";
import { deliverPublicationNotice } from "@/lib/server/telegram-publication";
import { telegramDelivery, youtubeDelivery, unavailableDelivery, type TelegramNotice, type YouTubeDelivery } from "@/lib/publication-status";
import { getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function administrator(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await createPublicServerClient().auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token) ? user : null;
}

export async function GET(request: Request) {
  if (!await administrator(request)) return reply({ error: "Acesso administrativo com dois fatores obrigatório." }, 403);
  const page = Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 500) return reply({ error: "Página inválida." }, 400);
  const db = createServiceDataClient();
  const { data: posts, count, error } = await db.from("posts").select("id,title,slug,is_published,scheduled_at,published_at,updated_at", { count: "exact" }).is("archived_at", null).order("updated_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 20, page * 20 - 1).abortSignal(AbortSignal.timeout(8000));
  if (error) return reply({ error: "Não foi possível carregar o acompanhamento." }, 503);
  const ids = (posts || []).map(post => post.id as string);
  if (!ids.length) return reply({ items: [], page, pages: Math.max(1, Math.ceil((count || 0) / 20)), warnings: [], checkedAt: new Date().toISOString() });
  const [telegram, youtube] = await Promise.all([
    db.from("bot_state").select("key,value,updated_at").in("key", ids.map(id => `telegram:publication:${id}`)).abortSignal(AbortSignal.timeout(8000)),
    db.from("reel_youtube_publications").select("post_id,status,updated_at,video_id,visibility").in("post_id", ids).order("updated_at", { ascending: false }).abortSignal(AbortSignal.timeout(8000)),
  ]);
  const notices = new Map((telegram.data || []).map(row => [String(row.key).replace("telegram:publication:", ""), row as TelegramNotice]));
  const publications = new Map<string, YouTubeDelivery>();
  for (const row of youtube.data || []) if (!publications.has(String(row.post_id))) publications.set(String(row.post_id), row as YouTubeDelivery);
  return reply({
    items: (posts || []).map(post => ({ id: post.id, title: post.title, slug: post.slug, site: post.is_published ? "published" : post.scheduled_at ? "scheduled" : "draft", publishedAt: post.published_at, telegram: telegram.error ? unavailableDelivery() : telegramDelivery(notices.get(String(post.id)) || null), youtube: youtube.error ? unavailableDelivery() : youtubeDelivery(publications.get(String(post.id)) || null) })),
    page, pages: Math.max(1, Math.ceil((count || 0) / 20)), checkedAt: new Date().toISOString(),
    warnings: [telegram.error && "A consulta do Telegram está indisponível.", youtube.error && "A consulta do YouTube está indisponível."].filter(Boolean),
  });
}

export async function POST(request: Request) {
  const user = await administrator(request);
  if (!user) return reply({ error: "Acesso administrativo com dois fatores obrigatório." }, 403);
  let body;
  try { body = JSON.parse((await readResponseBuffer(new Response(request.body), 2048)).toString("utf8")); } catch { return reply({ error: "Solicitação inválida." }, 400); }
  if (!body || body.destination !== "telegram" || body.confirmed !== true || typeof body.postId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.postId)) return reply({ error: "Confirme a nova tentativa apenas para o aviso do Telegram." }, 400);
  const db = createServiceDataClient();
  const { data: notice, error: noticeError } = await db.from("bot_state").select("value,updated_at").eq("key", `telegram:publication:${body.postId}`).maybeSingle();
  const { data: post, error: postError } = await db.from("posts").select("is_published").eq("id", body.postId).maybeSingle();
  if (noticeError || postError) return reply({ error: "Não foi possível confirmar o estado atual. Nenhum envio foi solicitado." }, 503);
  if (!post?.is_published || notice?.value !== "failed") return reply({ error: "O aviso não está em falha confirmada ou a matéria não está publicada. Atualize o acompanhamento." }, 409);
  const { data: allowed, error: rateError } = await db.rpc("consume_rate_limit", { p_action: "publication_retry", p_identity_hash: user.id, p_window_start: getRateLimitWindowStart(new Date(), 60_000).toISOString(), p_limit: 5 });
  if (rateError || !allowed) return reply({ error: "Aguarde um minuto antes de solicitar mais tentativas." }, 429);
  try {
    const sent = await deliverPublicationNotice(body.postId);
    return reply({ sent, message: sent ? "Aviso enviado ao Telegram. Os outros destinos não foram alterados." : "O envio não foi confirmado. Atualize o acompanhamento antes de tentar novamente." });
  } catch { return reply({ error: "Não foi possível confirmar o envio. Atualize o acompanhamento antes de tentar novamente." }, 503); }
}
