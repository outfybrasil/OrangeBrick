import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  releaseOutputDimensions,
  validateReleaseSourceDimensions,
  validateReleaseSourceUrl,
} from "@/lib/release-images";
import type { EditorialImage } from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);

type ImageKind = "cover" | "body" | "release";

interface ProcessedImage {
  output: Buffer;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
}

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

async function downloadImage(sourceUrl: string, kind: ImageKind) {
  if (kind === "release") {
    const sourceError = validateReleaseSourceUrl(sourceUrl);
    if (sourceError) throw new Error(sourceError);
  }
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
      const redirectedUrl = new URL(location, currentUrl).toString();
      if (kind === "release") {
        const redirectError = validateReleaseSourceUrl(redirectedUrl);
        if (redirectError) throw new Error(redirectError);
      }
      currentUrl = await assertSafeUrl(redirectedUrl);
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

async function readUploadedImage(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Envie uma imagem JPEG, PNG, WebP ou AVIF");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("A imagem ultrapassa 10 MB");
  const source = Buffer.from(await file.arrayBuffer());
  if (source.byteLength > MAX_SOURCE_BYTES) throw new Error("A imagem ultrapassa 10 MB");
  return source;
}

async function createStandardImage(source: Buffer, kind: ImageKind): Promise<ProcessedImage> {
  const normalized = await sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .toBuffer();
  const metadata = await sharp(normalized).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Não foi possível ler as dimensões da imagem");
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) throw new Error("Formato de imagem incompatível");

  if (kind === "release") {
    const dimensionError = validateReleaseSourceDimensions(metadata.width, metadata.height);
    if (dimensionError) throw new Error(dimensionError);
    const dimensions = releaseOutputDimensions(metadata.width, metadata.height);
    const output = await sharp(normalized)
      .resize(dimensions.width, dimensions.height, {
        fit: "cover",
        position: "centre",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    return {
      output,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  const background = await sharp(normalized)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.42, saturation: 0.78 })
    .webp({ quality: 78 })
    .toBuffer();

  const foreground = await sharp(normalized)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const output = await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
  return {
    output,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
  };
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
    const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const input = isMultipart ? await request.formData() : await request.json();
    const value = (key: string) => isMultipart
      ? input instanceof FormData ? input.get(key) : null
      : input && typeof input === "object" ? (input as Record<string, unknown>)[key] : null;
    const sourceUrlValue = value("sourceUrl");
    const sourceUrl = typeof sourceUrlValue === "string" ? sourceUrlValue.trim() : "";
    const postIdValue = value("postId");
    const postId = typeof postIdValue === "string" && postIdValue ? postIdValue : null;
    const altTextValue = value("altText");
    const altText = typeof altTextValue === "string" ? altTextValue.trim().slice(0, 500) : null;
    const kindValue = value("kind");
    const kind: ImageKind = kindValue === "body" || kindValue === "release" ? kindValue : "cover";
    const releaseIdValue = value("releaseId");
    const releaseId = typeof releaseIdValue === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(releaseIdValue)
      ? releaseIdValue
      : null;
    const fileValue = value("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    if (!sourceUrl && !file) {
      return NextResponse.json({ error: "Informe a URL original ou selecione um arquivo" }, { status: 400 });
    }
    if (sourceUrl && file) {
      return NextResponse.json({ error: "Use uma URL ou um arquivo por vez" }, { status: 400 });
    }

    const source = file ? await readUploadedImage(file) : await downloadImage(sourceUrl, kind);
    const processed = await createStandardImage(source, kind);
    const supabase = serviceClient();
    const folder = kind === "release"
      ? `editorial/releases/${releaseId || "unassigned"}`
      : `editorial/${postId || "unassigned"}`;
    const path = `${folder}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, processed.output, {
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
        source_url: sourceUrl || `upload:${file?.name || "imagem"}`,
        storage_path: path,
        public_url: publicData.publicUrl,
        alt_text: altText,
        width: processed.width,
        height: processed.height,
        file_size: processed.output.byteLength,
        mime_type: "image/webp",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from("post-images").remove([path]);
      throw error;
    }

    return NextResponse.json({
      image: data,
      source: { width: processed.sourceWidth, height: processed.sourceHeight },
      output: { width: processed.width, height: processed.height },
    });
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

export async function DELETE(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json();
    const imageId = typeof body.imageId === "string" ? body.imageId : "";
    const publicUrl = typeof body.publicUrl === "string" ? body.publicUrl : "";
    if (!imageId && !publicUrl) {
      return NextResponse.json({ error: "Informe a imagem que deve ser removida" }, { status: 400 });
    }

    const supabase = serviceClient();
    let query = supabase.from("editorial_images").select("*");
    query = imageId ? query.eq("id", imageId) : query.eq("public_url", publicUrl);
    const { data: image, error: loadError } = await query.maybeSingle<EditorialImage>();
    if (loadError) throw loadError;
    if (!image) return NextResponse.json({ ok: true });
    if (image.post_id) {
      return NextResponse.json({ error: "A imagem está vinculada a uma matéria" }, { status: 409 });
    }

    const { count, error: usageError } = await supabase
      .from("release_radar_items")
      .select("id", { count: "exact", head: true })
      .eq("image_url", image.public_url);
    if (usageError) throw usageError;
    if ((count || 0) > 0) {
      return NextResponse.json({ error: "A imagem ainda está em uso no Radar" }, { status: 409 });
    }

    const { error: storageError } = await supabase.storage.from("post-images").remove([image.storage_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await supabase.from("editorial_images").delete().eq("id", image.id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remover a imagem";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
