import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const adminSupabase = createServiceRoleClient() as any;

    if (id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
      }
      const { data, error } = await adminSupabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
      return NextResponse.json({ success: true, post: data });
    }

    const { data, error } = await adminSupabase.from("posts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, posts: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const adminSupabase = createServiceRoleClient() as any;
    const { error } = await adminSupabase.from("posts").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: "Postagem excluída com sucesso" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}
