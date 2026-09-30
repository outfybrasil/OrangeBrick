import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST_LIST_COLUMNS } from "@/lib/types/database";
import { getNewsRateLimit, normalizeNewsSearch, parseNewsPage } from "@/lib/news-query";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseNewsPage(searchParams.get("page"));
  if (page === null) {
    return NextResponse.json({ error: "Página inválida" }, { status: 400 });
  }
  const pageSize = 20;
  const period = searchParams.get("periodo");
  const search = normalizeNewsSearch(searchParams.get("q") || "");
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return NextResponse.json({ error: "Config missing" }, { status: 500 });

  const serviceKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceKey) {
    return NextResponse.json({ error: "Serviço indisponível" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const salt = process.env.RATE_LIMIT_SALT || serviceKey;
  const identity = getRateLimitIdentity(request, salt);
  if (!identity) {
    return NextResponse.json({ error: "Serviço indisponível" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const windowStart = getRateLimitWindowStart();
  const rateLimit = getNewsRateLimit(search);
  const limiter = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: allowed, error: rateLimitError } = await limiter.rpc("consume_rate_limit", {
    p_action: rateLimit.action,
    p_identity_hash: identity,
    p_window_start: windowStart.toISOString(),
    p_limit: rateLimit.limit,
  });
  if (rateLimitError) {
    console.error("News rate-limit check failed", rateLimitError.code);
    return NextResponse.json({ error: "Serviço indisponível" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Muitas consultas. Aguarde um minuto e tente novamente." }, {
      status: 429,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
    });
  }

  const supabase = createClient(url, anonKey);
  let query = supabase.from("posts").select(POST_LIST_COLUMNS, { count: "exact" }).eq("is_published", true).order("published_at", { ascending: false });
  const category = searchParams.get("category");
  const validCategories = ["breaking", "hardware", "industry", "modding", "review", "opinion"];
  if (category && validCategories.includes(category)) {
    query = query.eq("category", category);
  }

  if (period === "mes") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    query = query.gte("published_at", start.toISOString());
  }
  if (search.length >= 2) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  if (error) {
    console.error("News query failed", error.code);
    return NextResponse.json({ error: "Não foi possível carregar as notícias" }, { status: 500 });
  }

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / pageSize),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
