import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  if (!user) return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });

  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("consume_rate_limit", { p_action: "avatar_upload", p_identity_hash: user.id, p_window_start: windowStart.toISOString(), p_limit: 10 });
  if (rateLimitError) return NextResponse.json({ error: "Não foi possível validar o envio" }, { status: 503 });
  if (!withinLimit) return NextResponse.json({ error: "Limite de dez alterações por hora atingido" }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File)) return NextResponse.json({ error: "Escolha uma imagem" }, { status: 400 });
    if (file.size > MAX_AVATAR_BYTES) return NextResponse.json({ error: "A imagem deve ter no máximo 4 MB" }, { status: 413 });
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return NextResponse.json({ error: "Use JPG, PNG, WebP ou AVIF" }, { status: 415 });

    const source = Buffer.from(await file.arrayBuffer());
    const output = await sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention" })
      .webp({ quality: 84, effort: 5 })
      .toBuffer();
    const { data: previousProfile, error: previousProfileError } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    if (previousProfileError || !previousProfile) {
      console.error("Falha ao carregar avatar atual", previousProfileError);
      return NextResponse.json({ error: "Não foi possível atualizar o perfil" }, { status: 500 });
    }
    const path = `${user.id}/avatar-${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("profile-images").upload(path, output, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (uploadError) {
      console.error("Falha ao armazenar avatar", uploadError);
      return NextResponse.json({ error: "Não foi possível armazenar esta imagem" }, { status: 502 });
    }
    const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();
    if (updateError || !updatedProfile) {
      await supabase.storage.from("profile-images").remove([path]);
      console.error("Falha ao atualizar avatar do perfil", updateError);
      return NextResponse.json({ error: "Não foi possível atualizar o perfil" }, { status: 500 });
    }
    const previousPath = profileImagePath(previousProfile.avatar_url, user.id, "avatar-");
    if (previousPath && previousPath !== path) await supabase.storage.from("profile-images").remove([previousPath]);
    return NextResponse.json({ publicUrl: data.publicUrl, bytes: output.byteLength });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar esta imagem" }, { status: 400 });
  }
}

function profileImagePath(publicUrl: string | null, userId: string, prefix: string) {
  if (!publicUrl) return null;
  try {
    const pathname = new URL(publicUrl).pathname;
    const marker = `/storage/v1/object/public/profile-images/${userId}/`;
    if (!pathname.startsWith(marker)) return null;
    const fileName = decodeURIComponent(pathname.slice(marker.length));
    if (!fileName.startsWith(prefix) || !fileName.endsWith(".webp") || fileName.includes("/")) return null;
    return `${userId}/${fileName}`;
  } catch {
    return null;
  }
}
