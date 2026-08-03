import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } }); }

async function bucketUsage(supabase: ReturnType<typeof serviceClient>, bucket: string, prefix = ""): Promise<{ files: number; bytes: number }> {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  let files = 0;
  let bytes = 0;
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata) { files += 1; bytes += Number(item.metadata.size || 0); }
    else { const nested = await bucketUsage(supabase, bucket, path); files += nested.files; bytes += nested.bytes; }
  }
  return { files, bytes };
}

async function bucketFiles(supabase: ReturnType<typeof serviceClient>, bucket: string, prefix = ""): Promise<Array<{ path: string; bytes: number }>> {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  const files: Array<{ path: string; bytes: number }> = [];
  for (const item of data || []) {
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
  const orphans = editorialFiles.filter((file) => file.path.startsWith("editorial/") && !tracked.has(file.path));
  return NextResponse.json({ editorial: { files: editorialFiles.length, bytes: editorialFiles.reduce((sum, file) => sum + file.bytes, 0) }, profiles, trackedEditorialFiles: tracked.size, possibleEditorialOrphans: orphans.length, orphans: orphans.slice(0, 200) });
}

export async function DELETE(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user } } = await supabase.auth.getUser(authorization.slice(7));
  if (user?.app_metadata?.is_admin !== true) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const body = await request.json() as { paths?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((path): path is string => typeof path === "string" && path.startsWith("editorial/")).slice(0, 100) : [];
  if (!paths.length) return NextResponse.json({ error: "Selecione arquivos órfãos" }, { status: 400 });
  const { data: tracked } = await supabase.from("editorial_images").select("storage_path").in("storage_path", paths);
  const protectedPaths = new Set((tracked || []).map((row) => row.storage_path));
  const safePaths = paths.filter((path) => !protectedPaths.has(path));
  if (safePaths.length) await supabase.storage.from("post-images").remove(safePaths);
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, action: "delete_orphan_files", target_type: "storage", details: { paths: safePaths } });
  return NextResponse.json({ deleted: safePaths.length });
}
