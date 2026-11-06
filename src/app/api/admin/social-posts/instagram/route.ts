import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { readRequestFormData, readResponseBuffer } from "@/lib/server/network";
import { enrichSocialPost } from "@/lib/social/post-context";
import { applySocialDefaults, instagramPostCaption, validateSocialDraft, type SocialSourcePost } from "@/lib/social/post-plan";
import { instagramConfigured, instagramGraph, publishInstagramImages } from "@/lib/social/instagram-graph";
import { claimInstagramPublication, ensureSocialBucket, latestInstagramPublication, saveInstagramPublication, socialDraftBucket, socialMediaBucket } from "@/lib/social/instagram-history";
import type { Database, SocialInstagramPublication, SocialPostDraft } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Batch = { draft: SocialPostDraft; createdAt: string; republishOf?: number };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function context(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: reply({ error: "Não autorizado." }, 401) };
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return { response: reply({ error: "Acesso negado." }, 403) };
  const params = new URL(request.url).searchParams;
  const id = params.get("postId") || "";
  const format = params.get("format");
  if (!uuid.test(id) || (format !== "single" && format !== "carousel")) return { response: reply({ error: "Selecione a matéria e o formato." }, 400) };
  const { data: post, error: postError } = await db.from("posts").select("id,slug,title,summary,body,image_url,image_alt,updated_at,information_status,category").eq("id", id).maybeSingle();
  if (postError) return { response: reply({ error: "Não foi possível conferir a matéria." }, 503) };
  if (!post) return { response: reply({ error: "Matéria não encontrada." }, 404) };
  return { db, post: await enrichSocialPost(db, post as SocialSourcePost), format: format as SocialPostDraft["format"] };
}

async function batch(db: SupabaseClient, post: SocialSourcePost, format: SocialPostDraft["format"], id: unknown): Promise<Batch> {
  if (typeof id !== "string" || !uuid.test(id)) throw new Error("Lote de imagens inválido.");
  const { data, error } = await db.storage.from(socialDraftBucket).download(`${post.id}/uploads/${id}.json`);
  if (error || !data) throw new Error("O lote não foi encontrado. Prepare o envio novamente.");
  const value = JSON.parse(await data.text()) as Batch;
  value.draft = validateSocialDraft(applySocialDefaults(value.draft, post), post);
  if (value.draft.format !== format || value.draft.slides.length > 10 || value.draft.sourceUpdatedAt !== post.updated_at) throw new Error("A matéria ou o formato mudou. Gere e revise uma nova versão.");
  if (!Number.isFinite(Date.parse(value.createdAt)) || Date.now() - Date.parse(value.createdAt) > 3600_000) throw new Error("Este lote expirou. Prepare o envio novamente.");
  return value;
}

export async function GET(request: Request) {
  try {
    const ctx = await context(request);
    if (ctx.response) return ctx.response;
    const { db, post, format } = ctx;
    const publication = await latestInstagramPublication(db, post.id, format);
    let account: Awaited<ReturnType<ReturnType<typeof instagramGraph>["account"]>> | null = null;
    let connectionError: string | null = null;
    if (instagramConfigured()) {
      try { account = await instagramGraph().account(); }
      catch (cause) { connectionError = cause instanceof Error ? cause.message : "Não foi possível confirmar a conta."; }
    }
    return reply({ configured: instagramConfigured(), account, connectionError, publication, maxSlides: 10, siteUrl: getSiteUrl() });
  } catch (cause) { return reply({ error: cause instanceof Error ? cause.message : "Não foi possível consultar o Instagram." }, 503); }
}

export async function POST(request: Request) {
  let claim: SocialInstagramPublication | null = null;
  let publishRequested = false;
  let dbForResult: SupabaseClient | null = null;
  let postIdForResult = "";
  let formatForResult: SocialPostDraft["format"] = "single";
  try {
    const ctx = await context(request);
    if (ctx.response) return ctx.response;
    const { db, post, format } = ctx;
    dbForResult = db; postIdForResult = post.id; formatForResult = format;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await readRequestFormData(request, 3_500_000);
      const id = form.get("batchId");
      const index = form.get("index");
      const file = form.get("image");
      const prepared = await batch(db, post, format, id);
      if (typeof index !== "string" || !/^\d+$/.test(index) || Number(index) >= prepared.draft.slides.length || !(file instanceof File) || file.size > 3 * 1024 * 1024) return reply({ error: "Arquivo ou posição de imagem inválidos." }, 400);
      const input = Buffer.from(await file.arrayBuffer());
      const image = sharp(input, { failOn: "error", limitInputPixels: 2_000_000 });
      const metadata = await image.metadata();
      if (metadata.format !== "jpeg" || metadata.width !== 1080 || metadata.height !== 1080) return reply({ error: "Envie apenas os JPGs de 1080 × 1080 preparados pelo editor." }, 400);
      const output = await image.jpeg({ quality: 96, chromaSubsampling: "4:4:4" }).toBuffer();
      const { error } = await db.storage.from(socialMediaBucket).upload(`${post.id}/${format}/${id}/${String(Number(index) + 1).padStart(2, "0")}.jpg`, output, { upsert: false, contentType: "image/jpeg" });
      if (error) return reply({ error: "Não foi possível guardar uma imagem. Prepare o envio novamente." }, 503);
      return reply({ uploaded: Number(index) });
    }
    const body = JSON.parse((await readResponseBuffer(new Response(request.body), 100_000)).toString("utf8")) as Record<string, unknown>;
    if (body.action === "prepare") {
      if (body.confirmed !== true) return reply({ error: "Revise o material e confirme a publicação antes de preparar o envio." }, 400);
      const draft = validateSocialDraft(applySocialDefaults(body.draft as SocialPostDraft, post), post);
      if (draft.format !== format || draft.sourceUpdatedAt !== post.updated_at) return reply({ error: "A matéria mudou. Gere uma nova versão antes de enviar." }, 409);
      if (draft.slides.length > 10) return reply({ error: "Este envio direto aceita até 10 imagens. Reduza os slides ou use o download para postar pelo aplicativo." }, 400);
      if (draft.music && body.withoutMusic !== true) return reply({ error: "Confirme o envio sem a música sugerida ou publique pelo aplicativo." }, 400);
      instagramPostCaption(draft, getSiteUrl());
      if (!instagramConfigured()) return reply({ error: "Configure a conexão do Instagram já usada pelos Reels." }, 400);
      const existing = await latestInstagramPublication(db, post.id, format);
      const republishOf = body.republishOf;
      if (republishOf !== undefined && (!Number.isInteger(republishOf) || existing?.status !== "published" || existing.attempt !== republishOf)) return reply({ error: "O histórico mudou. Atualize e confirme novamente a republicação.", publication: existing }, 409);
      if (existing && existing.status !== "failed" && republishOf === undefined) return reply({ error: "Este formato já tem um envio registrado. Confira o histórico antes de repetir.", publication: existing }, 409);
      await ensureSocialBucket(db); await ensureSocialBucket(db, true);
      const id = randomUUID();
      const value: Batch = { draft, createdAt: new Date().toISOString(), ...(typeof republishOf === "number" ? { republishOf } : {}) };
      const { error } = await db.storage.from(socialDraftBucket).upload(`${post.id}/uploads/${id}.json`, JSON.stringify(value), { upsert: false, contentType: "application/json", cacheControl: "0" });
      if (error) return reply({ error: "Não foi possível preparar o lote de imagens." }, 503);
      return reply({ batchId: id });
    }
    const graph = instagramGraph();
    if (body.action === "check") {
      const current = await latestInstagramPublication(db, post.id, format);
      if (!current || current.status === "published" || current.status === "failed" || !current.containerId) return reply({ publication: current });
      const account = await graph.account();
      if (account.id !== current.accountId) return reply({ error: "A conta conectada mudou. Confira o envio na conta original." }, 409);
      const result = await graph.call(`${current.containerId}?fields=status_code,status`);
      if (result.status_code === "PUBLISHED") {
        current.status = "published"; current.phase = "finished"; current.error = null;
        await saveInstagramPublication(db, post.id, format, current);
      } else if (result.status_code === "ERROR" || result.status_code === "EXPIRED") {
        current.status = "failed"; current.phase = "finished"; current.error = "O Instagram confirmou que este envio não foi publicado. Uma nova tentativa está disponível.";
        await saveInstagramPublication(db, post.id, format, current);
      }
      return reply({ publication: current });
    }
    if (body.action !== "publish" || body.confirmed !== true) return reply({ error: "Confirme a publicação no Instagram." }, 400);
    const prepared = await batch(db, post, format, body.batchId);
    if (prepared.draft.music && body.withoutMusic !== true) return reply({ error: "Confirme o envio sem música." }, 400);
    const account = await graph.account();
    if (account.id !== body.accountId) return reply({ error: "A conta de destino mudou. Atualize a conexão e revise antes de publicar." }, 409);
    const paths = prepared.draft.slides.map((_, index) => `${post.id}/${format}/${body.batchId}/${String(index + 1).padStart(2, "0")}.jpg`);
    const { data: signed, error: signingError } = await db.storage.from(socialMediaBucket).createSignedUrls(paths, 3600);
    if (signingError || !signed || signed.length !== paths.length || signed.some(item => item.error || !item.signedUrl)) return reply({ error: "Uma imagem ainda não está disponível. Prepare o envio novamente." }, 400);
    claim = await claimInstagramPublication(db, post.id, format, String(body.batchId), account, prepared.republishOf);
    if (!claim) return reply({ error: "Já existe um envio deste formato. Atualize o histórico antes de repetir.", publication: await latestInstagramPublication(db, post.id, format) }, 409);
    const caption = instagramPostCaption(prepared.draft, getSiteUrl());
    const result = await publishInstagramImages({ account, caption, images: signed.map((item, index) => ({ url: item.signedUrl!, alt: [prepared.draft.slides[index].alt, prepared.draft.slides[index].title, prepared.draft.slides[index].text].filter(Boolean).join(". ") })), call: graph.call, beforePublish: async containerId => {
      claim!.containerId = containerId; claim!.phase = "publishing";
      await saveInstagramPublication(db, post.id, format, claim!);
      publishRequested = true;
    } });
    claim.status = "published"; claim.phase = "finished"; claim.mediaId = result.mediaId; claim.containerId = result.containerId;
    await saveInstagramPublication(db, post.id, format, claim);
    try {
      const media = await graph.call(`${result.mediaId}?fields=permalink`);
      if (media.permalink && /^https:\/\/(?:www\.)?instagram\.com\//i.test(media.permalink)) claim.permalink = media.permalink;
      await saveInstagramPublication(db, post.id, format, claim);
    } catch {}
    return reply({ success: true, publication: claim, message: "Publicado no Instagram." });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Não foi possível concluir o envio ao Instagram.";
    if (claim && dbForResult) {
      if (claim.status !== "published") { claim.status = publishRequested ? "unknown" : "failed"; claim.error = publishRequested ? "O resultado não foi confirmado. Confira o Instagram e atualize o histórico antes de repetir." : message; }
      try { await saveInstagramPublication(dbForResult, postIdForResult, formatForResult, claim); } catch {}
      return reply({ error: claim.status === "published" ? "O Instagram confirmou a publicação, mas houve uma falha ao salvar o histórico. Confira o post na conta." : claim.error, publication: claim }, 502);
    }
    return reply({ error: message }, 400);
  }
}
