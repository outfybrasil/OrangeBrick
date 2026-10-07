import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

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
  const { data: { user } } = await serviceClient().auth.getUser(authorization.slice(7));
  return user?.app_metadata?.is_admin === true ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const searchParams = new URL(request.url).searchParams;
  const cursorCreatedAt = searchParams.get("createdAt");
  const cursorId = searchParams.get("id");
  if (Boolean(cursorCreatedAt) !== Boolean(cursorId)) {
    return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
  }
  if (cursorCreatedAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(cursorCreatedAt) || !Number.isFinite(Date.parse(cursorCreatedAt)) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursorId || ""))) {
    return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
  }

  let query = serviceClient()
    .from("contact_submissions")
    .select("id,name,company,subject,email,message,is_read,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursorCreatedAt && cursorId) {
    query = query.or(`created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`);
  }
  const { data, error } = await query.limit(51);
  if (error) return NextResponse.json({ error: "Não foi possível carregar os contatos" }, { status: 500 });
  const rows = data || [];
  const submissions = rows.slice(0, 50);
  const lastSubmission = submissions[submissions.length - 1];
  const nextCursor = rows.length > 50 && lastSubmission
    ? { createdAt: lastSubmission.created_at, id: lastSubmission.id }
    : null;
  return NextResponse.json({ submissions, nextCursor }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; is_read?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id || id.length > 100 || typeof body?.is_read !== "boolean") {
    return NextResponse.json({ error: "Contato inválido" }, { status: 400 });
  }

  const { error } = await serviceClient()
    .from("contact_submissions")
    .update({ is_read: body.is_read })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o contato" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
