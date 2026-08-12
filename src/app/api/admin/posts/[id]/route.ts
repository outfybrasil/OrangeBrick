import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function driveFileIds(sources: unknown) {
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((source) => {
    if (!source || typeof source !== "object" || !("url" in source) || typeof source.url !== "string") return [];
    const match = source.url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    return match ? [match[1]] : [];
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: post, error: fetchError } = await supabase.from("posts").select("id, editorial_sources").eq("id", id).single();
  if (fetchError || !post) return NextResponse.json({ error: "Matéria não encontrada" }, { status: 404 });

  const fileIds = driveFileIds(post.editorial_sources);
  if (fileIds.length > 0) {
    const deletedAt = new Date().toISOString();
    const markerErrors = await Promise.all(fileIds.map(async (driveFileId) => {
      const marker = new Blob([JSON.stringify({ drive_file_id: driveFileId, post_id: id, deleted_at: deletedAt })], { type: "image/png" });
      const { error } = await supabase.storage
        .from("post-images")
        .upload(`system/drive-import-tombstones/${driveFileId}.png`, marker, {
          contentType: "image/png",
          cacheControl: "0",
          upsert: true,
        });
      return error;
    }));
    const markerError = markerErrors.find(Boolean);
    if (markerError) return NextResponse.json({ error: markerError.message }, { status: 500 });

    const { error: auditError } = await supabase.from("admin_audit_log").insert(
      fileIds.map((driveFileId) => ({
        actor_id: user.id,
        action: "delete",
        target_type: "drive_import",
        target_id: driveFileId,
        details: { post_id: id, drive_file_id: driveFileId },
      })),
    );
    if (auditError && auditError.code !== "PGRST205" && !auditError.message.includes("schema cache")) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    const { error: registryError } = await supabase.from("drive_import_registry").upsert(
      fileIds.map((driveFileId) => ({ drive_file_id: driveFileId, post_id: id, status: "deleted", updated_at: deletedAt })),
      { onConflict: "drive_file_id" },
    );
    if (registryError && registryError.code !== "PGRST205" && !registryError.message.includes("schema cache")) {
      return NextResponse.json({ error: registryError.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await supabase.from("posts").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
