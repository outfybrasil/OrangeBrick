import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const categories = ["breaking", "industry", "hardware", "review", "opinion", "modding"];

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function saoPauloNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute),
  };
}

async function automationStatus(supabase: ReturnType<typeof serviceClient>) {
  const now = new Date();
  const { date, minuteOfDay } = saoPauloNow(now);
  const hours = [11, 17, 20];
  const keys = hours.map((hour) => `scheduled-publication:${date}:${hour}`);
  try {
    const [slots, pending, sending] = await Promise.all([
      supabase.from("bot_state").select("key,value,updated_at").in("key", keys),
      supabase.from("bot_state").select("key", { count: "exact", head: true }).like("key", "telegram:publication:%").eq("value", "pending"),
      supabase.from("bot_state").select("key", { count: "exact", head: true }).like("key", "telegram:publication:%").like("value", "sending:%"),
    ]);
    if (slots.error || pending.error || sending.error) {
      return { ready: false, date, reason: "Registros da automação indisponíveis. Verifique a tabela bot_state." };
    }
    const states = new Map((slots.data || []).map((row) => [row.key, row]));
    return {
      ready: true,
      date,
      slots: hours.map((hour, index) => {
        const row = states.get(keys[index]);
        const stale = row && now.getTime() - Date.parse(row.updated_at) > 360_000;
        return {
          hour,
          state: stale && (row.value === "running" || row.value.startsWith("publishing:"))
            ? "stalled"
            : row?.value || (minuteOfDay < hour * 60 + 60 ? "awaiting" : "missing"),
          updatedAt: row?.updated_at || null,
        };
      }),
      pendingNotices: (pending.count || 0) + (sending.count || 0),
    };
  } catch {
    return { ready: false, date, reason: "Registros da automação indisponíveis. Verifique a tabela bot_state." };
  }
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = serviceClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user || user.app_metadata?.is_admin !== true) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const [published, drafts, scheduled, authors, automation, categoryCounts] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false).is("scheduled_at", null),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false).not("scheduled_at", "is", null),
    supabase.from("posts").select("author_name").not("author_name", "is", null),
    automationStatus(supabase),
    Promise.all(categories.map(async (category) => {
      const result = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("category", category);
      return { category, count: result.count, error: result.error };
    })),
  ]);

  if (published.error || drafts.error || scheduled.error || authors.error || categoryCounts.some((item) => item.error)) {
    return NextResponse.json({ error: "Não foi possível consultar as estatísticas das matérias." }, { status: 503 });
  }

  const authorsList = [...new Set((authors.data || []).map((r) => r.author_name).filter(Boolean))];

  return NextResponse.json({
    publishedCount: published.count || 0,
    draftsCount: drafts.count || 0,
    scheduledCount: scheduled.count || 0,
    authorsList,
    categoryCounts: categoryCounts.map(({ category, count }) => ({ category, count: count || 0 })),
    automation,
  });
}
