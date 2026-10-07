import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function authorized(request: Request) {
  const authorization = request.headers.get("authorization");
  if (request.method === "GET") {
    return isAuthorizedCronRequest(request);
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
  const batchSize = 100;
  let archivedItems = 0;
  let removedFiles = 0;
  let batchesProcessed = 0;

  while (true) {
    const { data: rows, error: loadError } = await supabase
      .from("release_radar_items")
      .select("id,image_url,release_date,is_active")
      .lt("release_date", firstDay)
      .or("is_active.eq.true,image_url.not.is.null")
      .order("release_date", { ascending: true })
      .order("id", { ascending: true })
      .limit(batchSize);
    if (loadError) return NextResponse.json({ error: "Falha ao localizar itens antigos" }, { status: 500 });
    if (!rows?.length) break;

    const paths = [...new Set(rows.map((item) => storagePath(item.image_url)).filter((path): path is string => Boolean(path)))];
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from("post-images").remove(paths);
      if (storageError) return NextResponse.json({ error: "Falha ao remover arquivos antigos" }, { status: 500 });
      removedFiles += paths.length;
      const imageUrls = [...new Set(rows.map((item) => item.image_url).filter((url): url is string => Boolean(url)))];
      if (imageUrls.length > 0) {
        const { error: libraryError } = await supabase.from("editorial_images").delete().in("public_url", imageUrls);
        if (libraryError) return NextResponse.json({ error: "Falha ao remover registros da biblioteca" }, { status: 500 });
      }
    }

    const ids = rows.map((item) => item.id);
    const { error: updateError } = await supabase
      .from("release_radar_items")
      .update({ image_url: null, is_active: false, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (updateError) return NextResponse.json({ error: "Falha ao retirar lançamentos antigos" }, { status: 500 });

    archivedItems += ids.length;
    batchesProcessed += 1;
  }

  return NextResponse.json({ archived_items: archivedItems, removed_files: removedFiles, batches_processed: batchesProcessed, cutoff: firstDay });
}
export async function GET(request: Request) {
  return cleanup(request);
}

export async function POST(request: Request) {
  return cleanup(request);
}
