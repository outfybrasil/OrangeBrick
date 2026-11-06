import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { latestInstagramPublication, summarizeInstagramPublications } from "@/lib/social/instagram-history";
import type { Database, SocialPostListStatus } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado." }, { status: 403, headers });
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") || "").split(","))];
  if (!ids.length || ids.length > 20 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return NextResponse.json({ error: "Informe até 20 matérias válidas." }, { status: 400, headers });
  const { data: posts, error: postError } = await db.from("posts").select("id").in("id", ids);
  if (postError) return NextResponse.json({ error: "Não foi possível conferir as matérias." }, { status: 503, headers });
  const rows = (posts || []) as Array<{ id: string }>;
  const statuses: Record<string, SocialPostListStatus> = {};
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, async () => {
    while (cursor < (rows.length)) {
      const post = rows[cursor++];
      try {
        const [single, carousel] = await Promise.all([latestInstagramPublication(db, post.id, "single"), latestInstagramPublication(db, post.id, "carousel")]);
        statuses[post.id] = summarizeInstagramPublications({ single, carousel });
      } catch { statuses[post.id] = { status: "unavailable", publishedFormats: [] }; }
    }
  }));
  return NextResponse.json({ statuses }, { headers });
}
