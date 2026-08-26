import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [published, drafts, scheduled, authors] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false).not("scheduled_at", "is", null),
    supabase.from("posts").select("author_name").not("author_name", "is", null),
  ]);

  const authorsList = [...new Set((authors.data || []).map((r) => r.author_name).filter(Boolean))];

  return NextResponse.json({
    publishedCount: published.count || 0,
    draftsCount: drafts.count || 0,
    scheduledCount: scheduled.count || 0,
    authorsList,
  });
}
