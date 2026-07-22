import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdminUser(user)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const bodyData = await request.json();
    const { id, slug, title, summary, body, category, image_url, image_alt, author_name, author_tag, is_published } = bodyData;

    if (!slug || !title || !summary || !body || !category) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    if (typeof slug !== "string" || slug.length > 200) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }
    if (typeof title !== "string" || title.length > 120) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }
    if (typeof summary !== "string" || summary.length > 300) {
      return NextResponse.json({ error: "Resumo inválido" }, { status: 400 });
    }

    const validCategories = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const adminSupabase = createServiceRoleClient() as any;
    const postPayload: Record<string, unknown> = {
      slug, title, summary, body, category,
      image_url: image_url || null, image_alt: image_alt || null,
      author_name: author_name || "Redação", author_tag: author_tag || null,
      is_published: !!is_published,
      published_at: is_published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
      }
      const { data, error } = await (adminSupabase.from("posts" as any) as any).update(postPayload).eq("id", id).select().single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await (adminSupabase.from("posts" as any) as any).insert({ ...postPayload, created_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, post: result });
  } catch (err: any) {
    console.error("Erro na API de posts:", err);
    return NextResponse.json({ error: err.message || "Erro interno no servidor" }, { status: 500 });
  }
}
