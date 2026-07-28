import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
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

async function safeUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Use uma URL HTTPS válida");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Endereço não permitido");
  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : [...await resolve4(url.hostname).catch(() => []), ...await resolve6(url.hostname).catch(() => [])];
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new Error("Endereço não permitido");
  return url;
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
    const path = `avatars/${user.id}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, output, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    const { error: recordError } = await supabase.from("editorial_images").insert({
      post_id: null,
      kind: "cover",
      source_url: sourceUrl,
      storage_path: path,
      public_url: data.publicUrl,
      alt_text: "Avatar de usuário",
      width: 512,
      height: 512,
      file_size: output.byteLength,
      mime_type: "image/webp",
      created_by: user.id,
    });
    if (recordError) {
      await supabase.storage.from("post-images").remove([path]);
      throw recordError;
    }
    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível salvar o avatar" },
      { status: 400 },
    );
  }
}
