import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import type { EditorialImage } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return first === 0
      || first === 10
      || first === 127
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }
  return normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:");
}

async function assertSafeUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use uma URL HTTP ou HTTPS");
  if (url.username || url.password) throw new Error("A URL não pode conter credenciais");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Endereço não permitido");

  const directIp = isIP(url.hostname) ? [url.hostname] : [];
  const resolved = directIp.length > 0
    ? directIp
    : [...await resolve4(url.hostname).catch(() => []), ...await resolve6(url.hostname).catch(() => [])];
  if (resolved.length === 0 || resolved.some(isPrivateAddress)) throw new Error("Endereço não permitido");
  return url;
}

async function downloadImage(sourceUrl: string) {
  let currentUrl = await assertSafeUrl(sourceUrl);

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg",
        "User-Agent": "OrangeBrick-ImageImporter/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("Redirecionamentos demais");
      currentUrl = await assertSafeUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) throw new Error(`A origem respondeu com HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
    if (!ALLOWED_TYPES.has(contentType)) throw new Error("A URL não retornou uma imagem compatível");
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_SOURCE_BYTES) throw new Error("A imagem ultrapassa 10 MB");
    const source = Buffer.from(await response.arrayBuffer());
    if (source.byteLength > MAX_SOURCE_BYTES) throw new Error("A imagem ultrapassa 10 MB");
    return source;
  }

  throw new Error("Não foi possível baixar a imagem");
}

async function createStandardImage(source: Buffer) {
  const metadata = await sharp(source, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Não foi possível ler as dimensões da imagem");

  const background = await sharp(source)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.42, saturation: 0.78 })
    .webp({ quality: 78 })
    .toBuffer();

  const foreground = await sharp(source)
    .rotate()
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  return user?.app_metadata?.is_admin === true ? user : null;
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("editorial_images")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Falha ao carregar a biblioteca" }, { status: 500 });

  const images = (data || []) as EditorialImage[];
  const postIds = [...new Set(images.map((image) => image.post_id).filter((id): id is string => Boolean(id)))];
  const { data: posts } = postIds.length
    ? await supabase.from("posts").select("*").in("id", postIds)
    : { data: [] };
  const postMap = new Map((posts || []).map((post) => [post.id, post]));

  return NextResponse.json({
    images: images.map((image) => ({ ...image, post: image.post_id ? postMap.get(image.post_id) || null : null })),
  });
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json();
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const postId = typeof body.postId === "string" && body.postId ? body.postId : null;
    const altText = typeof body.altText === "string" ? body.altText.trim().slice(0, 500) : null;
    const kind = ["cover", "body", "release"].includes(body.kind) ? body.kind : "cover";
    if (!sourceUrl) return NextResponse.json({ error: "Informe a URL da imagem" }, { status: 400 });

    const source = await downloadImage(sourceUrl);
    const output = await createStandardImage(source);
    const supabase = serviceClient();
    const path = `editorial/${postId || "unassigned"}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, output, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(path);
    const { data, error } = await supabase
      .from("editorial_images")
      .insert({
        post_id: postId,
        kind,
        source_url: sourceUrl,
        storage_path: path,
        public_url: publicData.publicUrl,
        alt_text: altText,
        width: OUTPUT_WIDTH,
        height: OUTPUT_HEIGHT,
        file_size: output.byteLength,
        mime_type: "image/webp",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from("post-images").remove([path]);
      throw error;
    }

    return NextResponse.json({ image: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar a imagem";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const imageIds = Array.isArray(body.imageIds)
    ? body.imageIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const postId = typeof body.postId === "string" ? body.postId : null;
  if (imageIds.length === 0 || !postId) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

  const supabase = serviceClient();
  const { error } = await supabase
    .from("editorial_images")
    .update({ post_id: postId, updated_at: new Date().toISOString() })
    .in("id", imageIds);

  if (error) return NextResponse.json({ error: "Falha ao vincular as imagens" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
