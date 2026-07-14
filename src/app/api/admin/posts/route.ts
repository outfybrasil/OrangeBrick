import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    // 1. Obter usuário logado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Validar e-mail do administrador
    const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Acesso proibido" }, { status: 403 });
    }

    // 3. Obter postagem individual ou lista completa usando o service role client
    const adminSupabase = createServiceRoleClient();
    
    if (id) {
      const { data, error } = await adminSupabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
      }
      return NextResponse.json({ success: true, post: data });
    }

    const { data, error } = await adminSupabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, posts: data });
  } catch (err: any) {
    console.error("Erro na API de listagem do admin:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID da postagem é obrigatório" }, { status: 400 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Acesso proibido" }, { status: 403 });
    }

    const adminSupabase = createServiceRoleClient();

    const { error } = await adminSupabase.from("posts").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Postagem excluída com sucesso" });
  } catch (err: any) {
    console.error("Erro na API de exclusão do admin:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
