import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

interface VoteUpdateBuilder {
  eq(column: string, value: string): VoteUpdateBuilder;
  select(columns: string): {
    maybeSingle(): PromiseLike<{
      data: { option_index: number } | null;
      error: Error | null;
    }>;
  };
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json() as { pollId?: unknown; optionId?: unknown };
    const pollId = typeof body.pollId === "string" ? body.pollId : "";
    const optionId = typeof body.optionId === "number" ? body.optionId : Number.NaN;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pollId) || !Number.isInteger(optionId)) {
      return NextResponse.json({ error: "Voto inválido" }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: poll, error: pollError } = await serviceClient
      .from("community_polls")
      .select("options, expires_at")
      .eq("id", pollId)
      .eq("is_active", true)
      .maybeSingle();

    const pollRecord = poll as unknown as { options: unknown; expires_at: string | null } | null;

    if (pollError || !pollRecord || (pollRecord.expires_at && new Date(pollRecord.expires_at) <= new Date())) {
      return NextResponse.json({ error: "Enquete indisponível" }, { status: 400 });
    }

    const options = Array.isArray(pollRecord.options) ? pollRecord.options : [];
    const isValidOption = options.some((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) return false;
      return Number((option as { id?: unknown }).id) === optionId;
    });

    if (!isValidOption) {
      return NextResponse.json({ error: "Opção inválida" }, { status: 400 });
    }

    const voteTable = serviceClient.from("community_poll_votes") as unknown as {
      update(values: { option_index: number }): VoteUpdateBuilder;
    };
    const { data: savedVote, error: updateError } = await voteTable
      .update({ option_index: optionId })
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .select("option_index")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!savedVote) {
      return NextResponse.json({ error: "Voto anterior não encontrado" }, { status: 409 });
    }

    return NextResponse.json({ optionId: savedVote.option_index });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha ao alterar voto da enquete", reference, error);
    return NextResponse.json(
      { error: "Não foi possível alterar o voto", reference },
      { status: 500 }
    );
  }
}
