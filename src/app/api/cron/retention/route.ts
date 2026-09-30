import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("apply_retention_policy");
  if (error) return NextResponse.json({ error: "Falha ao aplicar retenção" }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: data });
}
