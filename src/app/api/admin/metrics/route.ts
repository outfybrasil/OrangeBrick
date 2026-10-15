import { NextResponse } from "next/server";
import { createPublicServerClient, createServiceDataClient } from "@/lib/supabase/server";
import { isVerifiedAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { data: { user }, error } = await createPublicServerClient().auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") || 7);
  if (![7, 30, 90].includes(days)) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  const client = createServiceDataClient();
  const [result, site] = await Promise.all([client.rpc("admin_audience_metrics", { p_days: days }), client.rpc("admin_site_metrics", { p_days: days })]);
  if (result.error || site.error) return NextResponse.json({ error: "Não foi possível carregar as métricas. Tente novamente." }, { status: 503 });
  return NextResponse.json({ ...result.data as object, site: site.data }, { headers: { "Cache-Control": "private, no-store" } });
}
