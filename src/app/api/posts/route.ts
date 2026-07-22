import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-static";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Obter usuário logado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado: Sessão não encontrada" }, { status: 401 });
    }

    // 2. Validar e-mail do administrador
    const adminEmail = process.env.ADMIN_EMAIL || "admin@orangebrick.com";
    if (user.email !== adminEmail) {
      return NextResponse.json({ error: "Acesso proibido: Apenas o administrador pode publicar" }, { status: 403 });
    }

    // 3. Obter payload
    const bodyData = await request.json();
    const {
      id,
      slug,
      title,
      summary,
      body, // pode ser string JSON ou texto clássico
      category,
      image_url,
      image_alt,
      author_name,
      author_tag,
      is_published,
    } = bodyData;

    if (!slug || !title || !summary || !body || !category) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    // 4. Usar service role client para ignorar RLS com segurança no servidor
    const adminSupabase = createServiceRoleClient() as any;

    const postPayload = {
      slug,
      title,
      summary,
      body,
      category,
      image_url: image_url || null,
      image_alt: image_alt || null,
      author_name: author_name || "Redação",
      author_tag: author_tag || null,
      is_published: !!is_published,
      published_at: is_published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      // Atualizar post existente
      const { data, error } = await adminSupabase
        .from("posts")
        .update(postPayload)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Inserir novo post
      const { data, error } = await adminSupabase
        .from("posts")
        .insert({
          ...postPayload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, post: result });
  } catch (err: any) {
    console.error("Erro na API de posts:", err);
    return NextResponse.json(
      { error: err.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
