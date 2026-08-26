import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const TABLE_COLUMNS = "id,slug,title,summary,category,image_url,author_name,is_published,published_at,created_at,updated_at";

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

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const editor = searchParams.get("editor");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") === "title" ? "title" : "updated_at";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("posts").select(TABLE_COLUMNS, { count: "exact" });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (status === "published") {
    query = query.eq("is_published", true);
  } else if (status === "production") {
    query = query.eq("is_published", false);
  }
  if (editor && editor !== "all") {
    query = query.eq("author_name", editor);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%,author_name.ilike.%${search}%`);
  }

  query = query.order(sort, { ascending: sort === "title" });
  if (sort === "updated_at") {
    query = query.order("title", { ascending: true });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
