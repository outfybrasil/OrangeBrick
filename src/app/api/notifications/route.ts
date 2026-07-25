import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") return false;
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { id?: unknown };
    const notificationId = typeof body.id === "string" ? body.id : null;

    if (notificationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) {
      return NextResponse.json({ error: "Notificação inválida" }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    let deletion = serviceClient
      .from("notifications")
      .delete({ count: "exact" })
      .eq("user_id", user.id);

    if (notificationId) {
      deletion = deletion.eq("id", notificationId);
    }

    const { error: deleteError, count } = await deletion;
    if (deleteError) throw deleteError;
    if (notificationId && count === 0) {
      return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ deleted: count ?? 0 });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Falha ao apagar notificações", reference, error);
    return NextResponse.json(
      { error: "Não foi possível apagar as notificações", reference },
      { status: 500 }
    );
  }
}
