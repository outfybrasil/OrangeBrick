import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
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
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "pending";
  if (!["pending", "resolved", "all"].includes(status)) {
    return NextResponse.json({ error: "Filtro inv\u00e1lido" }, { status: 400 });
  }

  const cursorCreatedAt = params.get("afterCreatedAt");
  const cursorId = params.get("afterId");
  if ((cursorCreatedAt && !Number.isFinite(Date.parse(cursorCreatedAt)))
    || (cursorId && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(cursorId))
    || Boolean(cursorCreatedAt) !== Boolean(cursorId)) {
    return NextResponse.json({ error: "Cursor inv\u00e1lido" }, { status: 400 });
  }

  const pageSize = 50;
  const client = serviceClient();
  let pageQuery = client
    .from("community_reports")
    .select("*");
  let totalQuery = client
    .from("community_reports")
    .select("id", { count: "exact", head: true });
  const pendingQuery = client
    .from("community_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (status === "pending") {
    pageQuery = pageQuery.eq("status", "pending");
    totalQuery = totalQuery.eq("status", "pending");
  } else if (status === "resolved") {
    pageQuery = pageQuery.neq("status", "pending");
    totalQuery = totalQuery.neq("status", "pending");
  }

  if (cursorCreatedAt && cursorId) {
    const normalizedCursor = new Date(cursorCreatedAt).toISOString();
    pageQuery = pageQuery.or(
      `created_at.lt.${normalizedCursor},and(created_at.eq.${normalizedCursor},id.lt.${cursorId})`,
    );
  }

  const [{ data: pageRows, error: pageError }, { count: totalCount, error: totalError }, { count: pendingCount, error: pendingError }] = await Promise.all([
    pageQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1),
    totalQuery,
    pendingQuery,
  ]);
  const error = pageError || totalError || pendingError;
  if (error) return NextResponse.json({ error: "N\u00e3o foi poss\u00edvel carregar as den\u00fancias" }, { status: 500 });

  const hasMore = (pageRows?.length || 0) > pageSize;
  const reports = (pageRows || []).slice(0, pageSize);
  const lastReport = reports.at(-1);
  const postIds = reports.filter((item) => item.content_type === "post").map((item) => item.content_id);
  const commentIds = reports.filter((item) => item.content_type === "comment").map((item) => item.content_id);
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
    reports: reports.map((report) => ({
      ...report,
      content: contentMap.get(report.content_id) || null,
    })),
    pendingCount: pendingCount || 0,
    totalCount: totalCount || 0,
    hasMore,
    nextCursor: hasMore && lastReport
      ? { created_at: lastReport.created_at, id: lastReport.id }
      : null,
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
