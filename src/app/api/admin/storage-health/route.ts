import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  filterOrphanedEditorialFilePaths,
  findOrphanedEditorialFiles,
  removeOrphanedEditorialFilesWithAudit,
} from "@/lib/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { autoRefreshToken: false, persistSession: false } }); }

async function listBucketItems(supabase: ReturnType<typeof serviceClient>, bucket: string, prefix: string) {
  const items = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    items.push(...(data || []));
    if (!data || data.length < 1000) return items;
  }
}

async function bucketUsage(supabase: ReturnType<typeof serviceClient>, bucket: string, prefix = ""): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;
  for (const item of await listBucketItems(supabase, bucket, prefix)) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) { files += 1; bytes += Number(item.metadata.size || 0); }
    else { const nested = await bucketUsage(supabase, bucket, path); files += nested.files; bytes += nested.bytes; }
  }
  return { files, bytes };
}

async function bucketFiles(supabase: ReturnType<typeof serviceClient>, bucket: string, prefix = ""): Promise<Array<{ path: string; bytes: number }>> {
  const files: Array<{ path: string; bytes: number }> = [];
  for (const item of await listBucketItems(supabase, bucket, prefix)) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) files.push({ path, bytes: Number(item.metadata.size || 0) });
    else files.push(...await bucketFiles(supabase, bucket, path));
  }
  return files;
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  if (user?.app_metadata?.is_admin !== true) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const [editorialFiles, profiles, { data: imageRows }] = await Promise.all([bucketFiles(supabase, "post-images"), bucketUsage(supabase, "profile-images"), supabase.from("editorial_images").select("storage_path")]);
  const tracked = new Set((imageRows || []).map((row) => row.storage_path));
  const orphans = findOrphanedEditorialFiles(editorialFiles, tracked);
  return NextResponse.json({ editorial: { files: editorialFiles.length, bytes: editorialFiles.reduce((sum, file) => sum + file.bytes, 0) }, profiles, trackedEditorialFiles: tracked.size, possibleEditorialOrphans: orphans.length, orphans: orphans.slice(0, 200) });
}

export async function DELETE(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  if (user?.app_metadata?.is_admin !== true) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  let body: { paths?: unknown };
  try {
    body = await request.json() as { paths?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const paths = Array.isArray(body.paths) ? body.paths : [];
  const requestedPaths = [...new Set(paths.filter((path): path is string =>
    typeof path === "string"
    && path.startsWith("editorial/")
    && path.length <= 1024
    && !path.split("/").some((segment) => !segment || segment === "." || segment === ".."),
  ))].slice(0, 100);
  if (!requestedPaths.length) return NextResponse.json({ error: "Selecione arquivos órfãos" }, { status: 400 });

  const { data: trackedRows, error: trackingError } = await supabase
    .from("editorial_images")
    .select("storage_path")
    .in("storage_path", requestedPaths);
  if (trackingError) return NextResponse.json({ error: "Não foi possível verificar os arquivos registrados" }, { status: 503 });

  let files: Array<{ path: string; bytes: number }>;
  try {
    files = await bucketFiles(supabase, "post-images");
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar os arquivos do Storage" }, { status: 503 });
  }

  const safePaths = filterOrphanedEditorialFilePaths(
    requestedPaths,
    files,
    (trackedRows || []).map((row) => row.storage_path),
  );
  if (!safePaths.length) return NextResponse.json({ deleted: 0, skipped: paths.length });

  const result = await removeOrphanedEditorialFilesWithAudit(safePaths, {
    async createPending(paths) {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .insert({ actor_id: user.id, action: "delete_orphan_files_pending", target_type: "storage", details: { paths } })
        .select("id")
        .single();
      return { id: data?.id ?? null, error: Boolean(error) };
    },
    async remove(paths) {
      const { error } = await supabase.storage.from("post-images").remove(paths);
      return { errorName: error?.name ?? null };
    },
    async updateAudit(id, action, details) {
      const { error } = await supabase
        .from("admin_audit_log")
        .update({ action, details })
        .eq("id", id);
      return !error;
    },
  });

  if (result.status === "audit_unavailable") {
    return NextResponse.json({ error: "A auditoria está indisponível; nenhum arquivo foi removido" }, { status: 503 });
  }
  if (result.status === "storage_failed") {
    return NextResponse.json({ error: "O Storage não confirmou a remoção", deleted: null, auditLogged: result.auditLogged }, { status: 502 });
  }
  if (result.status === "audit_incomplete") {
    return NextResponse.json({ error: "Arquivos removidos, mas não foi possível concluir o registro de auditoria", deleted: result.deleted, auditLogged: false }, { status: 503 });
  }

  return NextResponse.json({ deleted: result.deleted, skipped: paths.length - safePaths.length });
}
