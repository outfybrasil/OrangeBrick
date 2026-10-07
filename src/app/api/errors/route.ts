import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const supabase = serviceClient();
  const secret = process.env.RATE_LIMIT_SALT || (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const identityHash = getRateLimitIdentity(request, secret || "");
  if (!identityHash) return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 });
  const windowStart = getRateLimitWindowStart(new Date(), 60 * 60 * 1000);
  const { data: withinLimit, error: rateLimitError } = await supabase.rpc("consume_rate_limit", {
    p_action: "client_error",
    p_identity_hash: identityHash,
    p_window_start: windowStart.toISOString(),
    p_limit: 20,
  });
  if (rateLimitError || withinLimit === null) {
    console.error("Falha ao validar limite da telemetria de erros", rateLimitError?.code ?? "sem resultado");
    return NextResponse.json({ error: "Telemetria temporariamente indisponível" }, { status: 503 });
  }
  if (!withinLimit) return new NextResponse(null, { status: 204 });

  const body = await request.json().catch(() => null) as {
    source?: unknown;
    message?: unknown;
    route?: unknown;
    reference?: unknown;
  } | null;
  if (!body || typeof body.message !== "string" || body.message.trim().length === 0) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { error: recordError } = await supabase.rpc("record_app_error", {
    target_source: typeof body.source === "string" ? body.source.slice(0, 80) : "web",
    target_message: body.message.trim().slice(0, 1000),
    target_route: typeof body.route === "string" ? body.route.slice(0, 300) : null,
    target_reference: typeof body.reference === "string" ? body.reference.slice(0, 100) : null,
    target_metadata: {},
  });
  if (recordError) {
    console.error("Falha ao persistir evento de erro", recordError.code);
    return NextResponse.json({ error: "Não foi possível registrar o erro" }, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
