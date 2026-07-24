import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (request.method === "GET") {
    return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
  }
  if (!authorization?.startsWith("Bearer ")) return false;
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  return user?.app_metadata?.is_admin === true;
}

function storagePath(publicUrl: string | null) {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/post-images/";
  const index = publicUrl.indexOf(marker);
  return index >= 0 ? decodeURIComponent(publicUrl.slice(index + marker.length).split("?")[0]) : null;
}

async function cleanup(request: Request) {
  if (!await authorized(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const today = new Date();
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const supabase = serviceClient();
  const { data: expired, error: loadError } = await supabase
    .from("release_radar_items")
    .select("*")
    .lt("release_date", firstDay);
  if (loadError) return NextResponse.json({ error: "Falha ao localizar itens antigos" }, { status: 500 });

  const rows = expired || [];
  const paths = rows.map((item) => storagePath(item.image_url)).filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("post-images").remove(paths);
    if (storageError) return NextResponse.json({ error: "Falha ao remover arquivos antigos" }, { status: 500 });
    await supabase.from("editorial_images").delete().in("public_url", rows.map((item) => item.image_url));
  }

  const ids = rows.filter((item) => item.image_url).map((item) => item.id);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("release_radar_items")
      .update({ image_url: null, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (updateError) return NextResponse.json({ error: "Falha ao limpar imagens antigas" }, { status: 500 });
  }

  return NextResponse.json({ cleared_images: ids.length, removed_files: paths.length, cutoff: firstDay });
}

export async function GET(request: Request) {
  return cleanup(request);
}

export async function POST(request: Request) {
  return cleanup(request);
}
