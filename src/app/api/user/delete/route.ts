import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    await Promise.all([
      serviceClient.from("profiles").delete().eq("user_id", user.id),
      serviceClient.from("comments").delete().eq("user_id", user.id),
      serviceClient.from("reactions").delete().eq("user_id", user.id),
    ]);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    const response = NextResponse.json({ success: true, message: "Conta excluída com sucesso" });
    response.cookies.set("sb-auth-token", "", { maxAge: 0, path: "/" });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao excluir conta" }, { status: 500 });
  }
}
