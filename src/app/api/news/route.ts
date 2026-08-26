import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;
  const period = searchParams.get("periodo");
  const search = searchParams.get("q");
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Config missing" }, { status: 500 });

  const supabase = createClient(url, anonKey);
  let query = supabase.from("posts").select(POST_LIST_COLUMNS, { count: "exact" }).eq("is_published", true).order("published_at", { ascending: false });

  if (period === "mes") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    query = query.gte("published_at", start.toISOString());
  }
  if (search && search.length >= 2) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / pageSize),
  });
}
