import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-push-notification`;

export async function POST(request: Request) {
  try {
    const { title, slug, category } = await request.json();

    if (!title || !slug) {
      return NextResponse.json({ error: "Campos obrigatórios: title, slug" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    const body = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({
        title: `🧱 ${title}`,
        body: `Nova matéria publicada na categoria ${category}`,
        url: `${siteUrl}${basePath}/post?slug=${slug}`,
      }),
    });

    const result = await body.json();

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao notificar" },
      { status: 500 }
    );
  }
}
