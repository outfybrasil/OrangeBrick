import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const client = serviceClient();
  const { data: { user } } = await client.auth.getUser(authorization.slice(7));
  return user?.app_metadata?.is_admin === true ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const client = serviceClient();
  const { data: reports, error } = await client
    .from("community_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Não foi possível carregar as denúncias" }, { status: 500 });

  const postIds = reports?.filter((item) => item.content_type === "post").map((item) => item.content_id) || [];
  const commentIds = reports?.filter((item) => item.content_type === "comment").map((item) => item.content_id) || [];
  const [{ data: posts }, { data: comments }] = await Promise.all([
    postIds.length
      ? client.from("community_posts").select("id,user_id,author_name,content,created_at").in("id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? client.from("community_comments").select("id,user_id,author_name,content,post_id,created_at").in("id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const contentMap = new Map<string, Record<string, unknown>>([
    ...(posts || []).map((item) => [item.id, item] as [string, Record<string, unknown>]),
    ...(comments || []).map((item) => [item.id, item] as [string, Record<string, unknown>]),
  ]);
  return NextResponse.json({
    reports: (reports || []).map((report) => ({
      ...report,
      content: contentMap.get(report.content_id) || null,
    })),
  });
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const body = await request.json().catch(() => null) as { reportId?: unknown; action?: unknown } | null;
  const reportId = typeof body?.reportId === "string" ? body.reportId : "";
  const action = typeof body?.action === "string" ? body.action : "";
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || !["dismiss", "delete", "suspend_7d", "ban"].includes(action)) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
  const client = serviceClient();
  const { error } = await client.rpc("admin_resolve_community_report", {
    target_report_id: reportId,
    target_action: action,
  });
  return error
    ? NextResponse.json({ error: "Não foi possível concluir a moderação" }, { status: 500 })
    : NextResponse.json({ ok: true });
}
