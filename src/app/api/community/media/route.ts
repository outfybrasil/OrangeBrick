import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await serviceClient().auth.getUser(token);
  return error ? null : user;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "A imagem deve ter no m\u00e1ximo 4 MB" }, { status: 413 });
  }
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Sess\u00e3o expirada" }, { status: 401 });

  const supabase = serviceClient();
  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("consume_rate_limit", {
    p_action: "community_media_upload",
    p_identity_hash: user.id,
    p_window_start: windowStart.toISOString(),
    p_limit: 10,
  });
  if (rateLimitError) return NextResponse.json({ error: "N\u00e3o foi poss\u00edvel validar o envio" }, { status: 503 });
  if (!withinLimit) return NextResponse.json({ error: "Limite de dez imagens por hora atingido" }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) return NextResponse.json({ error: "Escolha uma imagem" }, { status: 400 });
    if (file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "A imagem deve ter no m\u00e1ximo 4 MB" }, { status: 413 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Use JPG, PNG ou WebP" }, { status: 415 });
    }

    const source = Buffer.from(await file.arrayBuffer());
    const output = await sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84, effort: 5 })
      .toBuffer();
    if (output.byteLength > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: "A imagem processada excede 4 MB" }, { status: 413 });
    }
    const path = `${user.id}/brick-${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("profile-images").upload(path, output, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: "N\u00e3o foi poss\u00edvel armazenar esta imagem" }, { status: 502 });
    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.publicUrl, path });
  } catch {
    return NextResponse.json({ error: "N\u00e3o foi poss\u00edvel processar esta imagem" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Sess\u00e3o expirada" }, { status: 401 });

  try {
    const body = await request.json() as { path?: unknown };
    if (typeof body.path !== "string" || !new RegExp(`^${user.id}/brick-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.webp$`, "i").test(body.path)) {
      return NextResponse.json({ error: "Caminho de imagem inv\u00e1lido" }, { status: 400 });
    }
    const { error } = await serviceClient().storage.from("profile-images").remove([body.path]);
    if (error) return NextResponse.json({ error: "N\u00e3o foi poss\u00edvel remover a imagem" }, { status: 502 });
    return NextResponse.json({ removed: true });
  } catch {
    return NextResponse.json({ error: "Solicita\u00e7\u00e3o inv\u00e1lida" }, { status: 400 });
  }
}
