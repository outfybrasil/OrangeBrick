import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { validateRemoteUrl } from "@/lib/server/network";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function safeUrl(value: string) {
  return validateRemoteUrl(value);
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  if (!user) return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);
  const { data: withinLimit, error: limitError } = await supabase.rpc("consume_rate_limit", {
    p_action: "avatar_import",
    p_identity_hash: user.id,
    p_window_start: windowStart.toISOString(),
    p_limit: 5,
  });
  if (limitError || !withinLimit) {
    return NextResponse.json({ error: "Limite de cinco avatares por hora atingido" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/`;
    if (!sourceUrl) return NextResponse.json({ publicUrl: null });
    if (sourceUrl.startsWith(storagePrefix) || sourceUrl.startsWith("/")) {
      return NextResponse.json({ publicUrl: sourceUrl });
    }

    let currentUrl = await safeUrl(sourceUrl);
    let response: Response | null = null;
    for (let redirect = 0; redirect <= 3; redirect += 1) {
      response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg",
          "User-Agent": "OrangeBrick-AvatarImporter/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("Redirecionamentos demais");
      currentUrl = await safeUrl(new URL(location, currentUrl).toString());
    }

    if (!response?.ok) throw new Error(`A origem respondeu com HTTP ${response?.status || 500}`);
    const contentType = response.headers.get("content-type")?.split(";")[0] || "";
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(contentType)) throw new Error("A URL não retornou uma imagem compatível");
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > 10 * 1024 * 1024) throw new Error("A imagem ultrapassa 10 MB");
    const source = Buffer.from(await response.arrayBuffer());
    if (source.byteLength > 10 * 1024 * 1024) throw new Error("A imagem ultrapassa 10 MB");
    const output = await sharp(source, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 86, effort: 5 })
      .toBuffer();
    const path = `avatars/${user.id}/avatar.webp`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, output, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível salvar o avatar" },
      { status: 400 },
    );
  }
}
