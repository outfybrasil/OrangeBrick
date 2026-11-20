import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { listBucketFiles, measureStorageUsage } from "@/lib/server/storage-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTECTED_REEL_PATHS = new Set([
  "long-videos/manifest-state.mp4",
  "long-videos/deleted-slugs.mp4",
]);

const MONITORED_TABLES = [
  { name: "posts", label: "Matérias" },
  { name: "editorial_images", label: "Imagens editoriais" },
  { name: "reel_jobs", label: "Jobs de Reels" },
  { name: "reel_social_publications", label: "Publicações sociais" },
  { name: "reel_social_metrics", label: "Métricas de Reels" },
  { name: "release_radar_items", label: "Radar de lançamentos" },
  { name: "games", label: "Catálogo de jogos" },
  { name: "audience_pageviews", label: "Visualizações de página" },
  { name: "home_engagement_events", label: "Eventos da home" },
  { name: "community_posts", label: "Posts da comunidade" },
  { name: "profiles", label: "Perfis" },
  { name: "app_error_events", label: "Erros registrados" },
] as const;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function authorizeAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 401 }) };
  }
  const token = authorization.slice(7);
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!isVerifiedAdminSession(user, token)) {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  return { supabase, user };
}

export async function GET(request: Request) {
  const auth = await authorizeAdmin(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const [usage, reelFiles, vpsRowResult, tableCounts] = await Promise.all([
    measureStorageUsage(supabase),
    listBucketFiles(supabase, "editorial-reels").catch(() => []),
    supabase.from("bot_state").select("value, updated_at").eq("key", "infra:vps-health").maybeSingle(),
    Promise.all(
      MONITORED_TABLES.map(async (table) => {
        const { count, error } = await supabase
          .from(table.name)
          .select("*", { count: "exact", head: true });
        return {
          name: table.name,
          label: table.label,
          rows: error ? null : (count ?? 0),
        };
      }),
    ),
  ]);

  let vps: Record<string, unknown> | null = null;
  let vpsUpdatedAt: string | null = null;
  let vpsStale = true;
  if (vpsRowResult.data?.value) {
    try {
      vps = JSON.parse(vpsRowResult.data.value) as Record<string, unknown>;
      vpsUpdatedAt = vpsRowResult.data.updated_at || (typeof vps.collectedAt === "string" ? vps.collectedAt : null);
      if (vpsUpdatedAt) {
        const ageMs = Date.now() - Date.parse(vpsUpdatedAt);
        vpsStale = !Number.isFinite(ageMs) || ageMs > 15 * 60 * 1000;
      }
    } catch {
      vps = null;
    }
  }

  const folderTotals = new Map<string, { folder: string; files: number; bytes: number }>();
  for (const file of reelFiles) {
    const folder = file.path.includes("/") ? file.path.split("/")[0] : "(raiz)";
    const current = folderTotals.get(folder) || { folder, files: 0, bytes: 0 };
    current.files += 1;
    current.bytes += file.bytes;
    folderTotals.set(folder, current);
  }

  const heavyReelFiles = reelFiles
    .filter((file) => !PROTECTED_REEL_PATHS.has(file.path) && file.bytes >= 100_000)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 60);

  const totalRows = tableCounts.reduce((sum, item) => sum + (item.rows ?? 0), 0);

  return NextResponse.json(
    {
      vps: vps ? { ...vps, updatedAt: vpsUpdatedAt, stale: vpsStale } : null,
      storage: {
        bytes: usage.bytes,
        files: usage.files,
        quotaBytes: usage.quotaBytes,
        ratio: usage.ratio,
        buckets: usage.buckets,
        reelFolders: [...folderTotals.values()].sort((a, b) => b.bytes - a.bytes),
        heavyReelFiles,
      },
      database: {
        totalRows,
        tables: tableCounts.sort((a, b) => (b.rows ?? 0) - (a.rows ?? 0)),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const auth = await authorizeAdmin(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: { paths?: unknown };
  try {
    body = (await request.json()) as { paths?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawPaths = Array.isArray(body.paths) ? body.paths : [];
  const safePaths = [...new Set(
    rawPaths.filter(
      (item): item is string =>
        typeof item === "string"
        && item.length > 0
        && item.length <= 1024
        && !PROTECTED_REEL_PATHS.has(item)
        && !item.startsWith("/")
        && !item.split("/").some((segment) => !segment || segment === "." || segment === ".."),
    ),
  )].slice(0, 50);

  if (!safePaths.length) {
    return NextResponse.json({ error: "Nenhum arquivo válido selecionado." }, { status: 400 });
  }

  const { error: removeError } = await supabase.storage.from("editorial-reels").remove(safePaths);
  if (removeError) {
    return NextResponse.json({ error: `Falha ao remover arquivos: ${removeError.message}` }, { status: 502 });
  }

  await supabase.from("admin_audit_log").insert({
    actor_id: user?.id ?? null,
    action: "delete_reel_storage_files",
    target_type: "storage",
    target_id: "editorial-reels",
    details: { count: safePaths.length, paths: safePaths },
  });

  return NextResponse.json({ deleted: safePaths.length });
}
