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
  const { data, error } = await serviceClient()
    .from("contact_submissions")
    .select("id,name,company,subject,email,message,is_read,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Não foi possível carregar os contatos" }, { status: 500 });
  return NextResponse.json({ submissions: data || [] }, { headers: { "Cache-Control": "no-store" } });
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
