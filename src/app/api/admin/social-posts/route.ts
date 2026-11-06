import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { isVerifiedAdminSession } from "@/lib/auth";
import type { Database, SocialPostDraft } from "@/lib/types/database";
import { enrichSocialPost } from "@/lib/social/post-context";
import { applySocialDefaults, socialPostAssets, validateSocialDraft, type SocialSourcePost } from "@/lib/social/post-plan";
import { fetchValidatedRemote, readResponseBuffer } from "@/lib/server/network";

export const runtime = "nodejs";
export const maxDuration = 60;
const bucket = "social-post-drafts";
const headers = { "Cache-Control": "private, no-store" };

async function context(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  const client = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return { response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  const id = new URL(request.url).searchParams.get("postId") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { response: NextResponse.json({ error: "Selecione uma matéria válida." }, { status: 400 }) };
  const { data: post, error: postError } = await client.from("posts").select("id,slug,title,summary,body,image_url,image_alt,updated_at,information_status,category").eq("id", id).maybeSingle();
  if (postError) return { response: NextResponse.json({ error: "Não foi possível carregar a matéria." }, { status: 500 }) };
  if (!post) return { response: NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 }) };
  return { client, post: await enrichSocialPost(client, post as SocialSourcePost) };
}

function missing(error: { message: string; statusCode?: string | number }) {
  return Number(error.statusCode) === 404 || /(?:object|bucket).*not found/i.test(error.message);
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (ctx.response) return ctx.response;
  const { client, post } = ctx;
  const params = new URL(request.url).searchParams;
  const assetIndex = params.get("asset");
  if (assetIndex !== null) {
    const asset = /^\d+$/.test(assetIndex) ? socialPostAssets(post)[Number(assetIndex)] : null;
    if (!asset) return NextResponse.json({ error: "Imagem não vinculada à matéria." }, { status: 400 });
    try {
      let bytes: Buffer;
      if (asset.url.startsWith("/") && !asset.url.startsWith("//")) {
        const publicRoot = await realpath(path.join(process.cwd(), "public"));
        const file = await realpath(path.resolve(publicRoot, decodeURIComponent(asset.url.split(/[?#]/)[0]).replace(/^\//, "")));
        if (!file.startsWith(publicRoot + path.sep)) throw new Error();
        bytes = await readFile(file);
        if (bytes.length > 12 * 1024 * 1024) throw new Error();
      } else {
        const response = await fetchValidatedRemote(asset.url, { httpsOnly: true, signal: AbortSignal.timeout(15_000) });
        if (response.status !== 200 || !/^image\/(jpeg|png|webp|avif)(;|$)/i.test(response.headers.get("content-type") || "")) throw new Error();
        bytes = await readResponseBuffer(response, 12 * 1024 * 1024);
      }
      const image = sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
      const metadata = await image.metadata();
      if (!metadata.format || !["jpeg", "png", "webp", "avif", "heif"].includes(metadata.format) || (metadata.width || 0) < 1200 || (metadata.height || 0) < 675) throw new Error();
      const output = await image.resize({ width: 2160, withoutEnlargement: true }).jpeg({ quality: 94 }).toBuffer();
      return new Response(new Uint8Array(output), { headers: { ...headers, "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" } });
    } catch {
      return NextResponse.json({ error: "A imagem não carregou ou tem resolução inferior a 1200 × 675. Corrija na matéria e tente novamente." }, { status: 422 });
    }
  }
  try {
    const drafts: Partial<Record<SocialPostDraft["format"], SocialPostDraft>> = {};
    const defaultsApplied: string[] = [];
    await Promise.all((["single", "carousel"] as const).map(async format => {
      const { data, error } = await client.storage.from(bucket).download(`${post.id}/${format}.json`);
      if (error && !missing(error)) throw error;
      if (data) {
        const stored = JSON.parse(await data.text()) as SocialPostDraft;
        drafts[format] = applySocialDefaults(stored, post);
        if (drafts[format] !== stored) defaultsApplied.push(format);
      }
    }));
    return NextResponse.json({ post, assets: socialPostAssets(post), drafts, defaultsApplied }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os rascunhos salvos. Tente novamente." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const ctx = await context(request);
  if (ctx.response) return ctx.response;
  const { client, post } = ctx;
  let draft: SocialPostDraft;
  try {
    const bytes = await readResponseBuffer(new Response(request.body), 100_000);
    draft = validateSocialDraft(applySocialDefaults(JSON.parse(bytes.toString("utf8")), post), post);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rascunho inválido." }, { status: 400 });
  }
  if (draft.sourceUpdatedAt !== post.updated_at) return NextResponse.json({ error: "A matéria mudou desde a geração. Reabra a matéria neste editor e gere uma nova versão." }, { status: 409 });
  const { data: existing, error: bucketError } = await client.storage.getBucket(bucket);
  if (bucketError && !missing(bucketError)) return NextResponse.json({ error: "Não foi possível acessar os rascunhos." }, { status: 503 });
  if (!existing) {
    const { error } = await client.storage.createBucket(bucket, { public: false, fileSizeLimit: 100_000, allowedMimeTypes: ["application/json"] });
    if (error && Number(error.statusCode) !== 409 && !/already exists/i.test(error.message)) return NextResponse.json({ error: "Não foi possível preparar o armazenamento dos rascunhos." }, { status: 503 });
  }
  draft.savedAt = new Date().toISOString();
  const { error } = await client.storage.from(bucket).upload(`${post.id}/${draft.format}.json`, JSON.stringify(draft), { contentType: "application/json", upsert: true, cacheControl: "0" });
  if (error) return NextResponse.json({ error: "Não foi possível salvar. Suas alterações continuam abertas; tente novamente." }, { status: 503 });
  return NextResponse.json({ draft }, { headers });
}
