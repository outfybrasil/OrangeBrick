import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { measureStorageUsage, STORAGE_ALERT_RATIO } from "@/lib/server/storage-usage";
import { notifyAdmin } from "@/lib/telegram/bot";

export const runtime = "nodejs";

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("apply_retention_policy");
  if (error) return NextResponse.json({ error: "Falha ao aplicar retenção" }, { status: 500 });

  let storageRatio: number | null = null;
  try {
    const usage = await measureStorageUsage(supabase);
    storageRatio = usage.ratio;
    if (usage.ratio >= STORAGE_ALERT_RATIO) {
      const largest = usage.buckets.slice(0, 3).map((bucket) => `• ${bucket.id}: ${megabytes(bucket.bytes)}`).join("\n");
      await notifyAdmin(`⚠️ <b>Storage do Supabase em ${Math.round(usage.ratio * 100)}%</b>\n${megabytes(usage.bytes)} de ${megabytes(usage.quotaBytes)} usados.\n\n${largest}\n\nRevise arquivos órfãos em Saúde e auditoria e confira o egress no painel do Supabase.`);
    }
  } catch {
    storageRatio = null;
  }

  return NextResponse.json({ ok: true, deleted: data, storageRatio });
}
