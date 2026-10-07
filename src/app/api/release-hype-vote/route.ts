import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceDataClient } from "@/lib/supabase/server";

type ReleaseHypeCountRow = {
  release_id: string;
  vote_type: "buy" | "watch" | "skip";
  vote_count: number;
};

function isReleaseHypeCountRow(value: unknown): value is ReleaseHypeCountRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.release_id === "string"
    && (row.vote_type === "buy" || row.vote_type === "watch" || row.vote_type === "skip")
    && typeof row.vote_count === "number"
    && Number.isFinite(row.vote_count)
    && row.vote_count >= 0;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Entre na sua conta para votar." }, { status: 401 });
    }

    const body = (await request.json()) as { releaseId?: unknown; vote?: unknown };
    const releaseId = typeof body.releaseId === "string" ? body.releaseId.trim() : "";
    const vote =
      body.vote === "buy" || body.vote === "watch" || body.vote === "skip" ? body.vote : null;

    if (!releaseId) {
      return NextResponse.json({ error: "Identificador de lançamento inválido." }, { status: 400 });
    }

    const serviceClient = createServiceDataClient();

    if (vote === null) {
      const { error: deleteError } = await serviceClient
        .from("release_hype_votes")
        .delete()
        .eq("release_id", releaseId)
        .eq("user_id", user.id);

      if (deleteError) {
        return NextResponse.json({ error: "Erro ao remover voto." }, { status: 500 });
      }
    } else {
      const { error: upsertError } = await serviceClient
        .from("release_hype_votes")
        .upsert({
          release_id: releaseId,
          user_id: user.id,
          vote_type: vote,
        }, { onConflict: "release_id,user_id" });

      if (upsertError) {
        return NextResponse.json({ error: "Erro ao registrar voto." }, { status: 500 });
      }
    }

    let countData: ReleaseHypeCountRow[] | null = null;
    try {
      const aggregate = await serviceClient.rpc("get_release_hype_counts");
      if (aggregate.error) {
        return NextResponse.json({ success: true, releaseId, userVote: vote, countsUnavailable: true });
      }
      const rawCounts: unknown = aggregate.data;
      if (!Array.isArray(rawCounts) || !rawCounts.every(isReleaseHypeCountRow)) {
        return NextResponse.json({ success: true, releaseId, userVote: vote, countsUnavailable: true });
      }
      countData = rawCounts;
    } catch {
      return NextResponse.json({ success: true, releaseId, userVote: vote, countsUnavailable: true });
    }

    const counts = { buy: 0, watch: 0, skip: 0 };
    for (const row of countData || []) {
      if (row.release_id === releaseId) {
        counts[row.vote_type] = Number(row.vote_count);
      }
    }

    return NextResponse.json({ success: true, releaseId, userVote: vote, counts });
  } catch {
    return NextResponse.json({ error: "Erro interno ao processar voto." }, { status: 500 });
  }
}
