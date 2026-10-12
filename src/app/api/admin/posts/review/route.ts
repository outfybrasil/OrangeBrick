import { after, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { enqueueEditorialReviews, loadEditorialReviews, processNextEditorialReview } from "@/lib/server/editorial-review-jobs";
import { readResponseBuffer } from "@/lib/server/network";

export const runtime = "nodejs";
export const maxDuration = 300;

async function administrator(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token) ? user : null;
}

function startWorker() {
  after(async () => { await processNextEditorialReview().catch(() => {}); });
}

export async function POST(request: Request) {
  const user = await administrator(request);
  if (!user) return NextResponse.json({ error: "Acesso administrativo com dois fatores obrigatório." }, { status: 403 });
  let body: { ids?: unknown };
  try { body = JSON.parse((await readResponseBuffer(new Response(request.body), 16 * 1024)).toString("utf8")); }
  catch { return NextResponse.json({ error: "Seleção inválida." }, { status: 400 }); }
  if (!body || !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50 || new Set(body.ids).size !== body.ids.length
    || body.ids.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return NextResponse.json({ error: "Selecione de uma a cinquenta matérias distintas." }, { status: 400 });
  try {
    const jobs = await enqueueEditorialReviews(body.ids as string[], user.id, "admin");
    startWorker();
    return NextResponse.json({ jobs, skipped: body.ids.length - jobs.length }, { status: 202, headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível iniciar a revisão automática." }, { status: 503 }); }
}

export async function GET(request: Request) {
  if (!await administrator(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  try {
    const jobs = await loadEditorialReviews();
    if (jobs.some((job) => ["queued", "running"].includes(job.status))) startWorker();
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível carregar o andamento das revisões." }, { status: 503 }); }
}
