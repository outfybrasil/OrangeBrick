import { isVerifiedAdminSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { saoPauloNewsDate } from "@/lib/news-query";

export const runtime = "nodejs";

const EDITOR_COLUMNS = "id,slug,title,summary,body,category,image_url,image_alt,author_name,author_tag,is_published,published_at,updated_at,topic_id,information_status,featured_quote,editorial_sources,short_article_reason,correction_note,scheduled_at,is_featured,featured_priority";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "N\u00e3o autorizado" }, { status: 401 });

  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await context.params;
  const { data: post, error } = await supabase.from("posts").select(EDITOR_COLUMNS).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!post) return NextResponse.json({ error: "Mat\u00e9ria n\u00e3o encontrada" }, { status: 404 });
  return NextResponse.json({ post }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Matéria inválida" }, { status: 400 });
  let body: { featured?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Solicitação inválida" }, { status: 400 }); }
  if (typeof body?.featured !== "boolean") return NextResponse.json({ error: "Escolha se a matéria será destacada" }, { status: 400 });
  const { data: post, error: postError } = await supabase.from("posts").select("id,is_published,published_at").eq("id", id).maybeSingle();
  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });
  if (!post?.is_published || !post.published_at) return NextResponse.json({ error: "A matéria precisa estar publicada" }, { status: 409 });
  const today = saoPauloNewsDate(new Date());
  if (body.featured && saoPauloNewsDate(post.published_at) !== today) return NextResponse.json({ error: "Só matérias publicadas hoje em Brasília podem ser destaque do dia" }, { status: 409 });
  if (body.featured) {
    const { error: clearError } = await supabase.from("posts").update({ is_featured: false, featured_priority: 0 }).eq("is_featured", true).neq("id", id);
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });
  }
  const { data: saved, error: saveError } = await supabase.from("posts").update({ is_featured: body.featured, featured_priority: body.featured ? 100 : 0, updated_at: new Date().toISOString() }).eq("id", id).eq("is_published", true).select("id,is_featured,updated_at").maybeSingle();
  if (saveError || !saved) return NextResponse.json({ error: saveError?.message || "Não foi possível definir o destaque" }, { status: 500 });
  revalidatePath("/");
  revalidatePath("/noticias");
  return NextResponse.json({ post: saved }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await context.params;
  const { error: deleteError } = await supabase.from("posts").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
