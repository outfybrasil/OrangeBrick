import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRateLimitIdentity, getRateLimitWindowStart } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(request: Request) {
  try {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }

    const body = await request.json();
    if (typeof body.website === "string" && body.website.length > 0) {
      return NextResponse.json({ ok: true });
    }

    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    if (/(bot|spider|crawler)/i.test(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    const secret = process.env.RATE_LIMIT_SALT || (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) || "";
    const identity = getRateLimitIdentity(request, secret);
    if (!identity) return NextResponse.json({ error: "Serviço indisponível" }, { status: 503 });
    const windowStart = getRateLimitWindowStart(new Date(), 60 * 60 * 1000);
    const client = serviceClient();

    const { data: allowed, error: rateError } = await client.rpc("consume_rate_limit", {
      p_action: "newsletter_signup",
      p_identity_hash: identity,
      p_window_start: windowStart.toISOString(),
      p_limit: 5,
    });
    if (rateError || !allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const { error } = await client.from("newsletter_subscribers").upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

    if (error) {
      console.error("Falha ao gravar inscrição na newsletter:", error.message);
      return NextResponse.json({ error: "Não foi possível registrar o e-mail." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}
