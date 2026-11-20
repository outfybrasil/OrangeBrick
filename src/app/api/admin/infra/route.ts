import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { listBucketFiles, measureStorageUsage } from "@/lib/server/storage-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_BUCKETS = new Set([
  "editorial-reels",
  "post-images",
  "social-post-media",
  "social-post-drafts",
  "profile-images",
]);

const PROTECTED_PATHS_BY_BUCKET: Record<string, Set<string>> = {
  "editorial-reels": new Set([
    "long-videos/manifest-state.mp4",
    "long-videos/deleted-slugs.mp4",
  ]),
};

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

function isSafeStoragePath(item: string): boolean {
  return (
    item.length > 0
    && item.length <= 1024
    && !item.startsWith("/")
    && !item.split("/").some((segment) => !segment || segment === "." || segment === "..")
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

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "browse") {
    const bucket = searchParams.get("bucket") || "editorial-reels";
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Bucket inválido." }, { status: 400 });
    }
    const files = await listBucketFiles(supabase, bucket);
    const protectedSet = PROTECTED_PATHS_BY_BUCKET[bucket] || new Set<string>();
    return NextResponse.json(
      {
        bucket,
        files: files.map((file) => ({
          path: file.path,
          bytes: file.bytes,
          updatedAt: file.updatedAt || null,
          mimetype: file.mimetype || null,
          protected: protectedSet.has(file.path),
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (action === "preview") {
    const bucket = searchParams.get("bucket") || "";
    const filePath = searchParams.get("path") || "";
    if (!ALLOWED_BUCKETS.has(bucket) || !isSafeStoragePath(filePath)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 300);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Não foi possível gerar link de visualização." }, { status: 502 });
    }
    return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
  }

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

  const protectedReels = PROTECTED_PATHS_BY_BUCKET["editorial-reels"];
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
        initialBucket: "editorial-reels",
        initialFiles: reelFiles.map((file) => ({
          path: file.path,
          bytes: file.bytes,
          updatedAt: file.updatedAt || null,
          mimetype: file.mimetype || null,
          protected: protectedReels.has(file.path),
        })),
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

  let body: { bucket?: unknown; paths?: unknown };
  try {
    body = (await request.json()) as { bucket?: unknown; paths?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const bucket = typeof body.bucket === "string" ? body.bucket : "editorial-reels";
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Bucket inválido." }, { status: 400 });
  }

  const protectedSet = PROTECTED_PATHS_BY_BUCKET[bucket] || new Set<string>();
  const rawPaths = Array.isArray(body.paths) ? body.paths : [];
  const safePaths = [...new Set(
    rawPaths.filter(
      (item): item is string =>
        typeof item === "string"
        && isSafeStoragePath(item)
        && !protectedSet.has(item),
    ),
  )].slice(0, 200);

  if (!safePaths.length) {
    return NextResponse.json({ error: "Nenhum arquivo válido selecionado." }, { status: 400 });
  }

  let deleted = 0;
  for (let i = 0; i < safePaths.length; i += 50) {
    const chunk = safePaths.slice(i, i + 50);
    const { error: removeError } = await supabase.storage.from(bucket).remove(chunk);
    if (removeError) {
      return NextResponse.json(
        { error: `Falha ao remover arquivos: ${removeError.message}`, deleted },
        { status: 502 },
      );
    }
    deleted += chunk.length;
  }

  await supabase.from("admin_audit_log").insert({
    actor_id: user?.id ?? null,
    action: "delete_storage_files",
    target_type: "storage",
    target_id: bucket,
    details: { count: deleted, paths: safePaths.slice(0, 50) },
  });

  return NextResponse.json({ deleted, bucket });
}
