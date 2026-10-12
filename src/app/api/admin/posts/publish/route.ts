import { inspectPublicationImagesInDatabase } from "@/lib/server/manual-publication-images";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { validateStoredEditorialPost } from "@/lib/content-validation";
import { readResponseBuffer } from "@/lib/server/network";
import type { Post } from "@/lib/types/database";

export const runtime = "nodejs";

function refreshPublicationPages() {
  for (const path of ["/", "/noticias", "/feed.xml", "/sitemap.xml", "/news-sitemap.xml"]) revalidatePath(path);
  revalidatePath("/posts/[slug]", "page");
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !isVerifiedAdminSession(user, token)) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  let body: { ids?: unknown; action?: unknown; reviewed?: unknown; id?: unknown; post?: unknown };
  try { body = JSON.parse((await readResponseBuffer(new Response(request.body), 256 * 1024)).toString("utf8")); }
  catch { return NextResponse.json({ error: "Requisição inválida ou muito grande." }, { status: 400 }); }
  if (body?.action === "save") {
    if (!body.post || typeof body.post !== "object" || Array.isArray(body.post)
      || (body.post as Record<string, unknown>).is_published !== true
      || (body.id != null && (typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)))) {
      return NextResponse.json({ error: "Confirme a publicação da matéria no editor." }, { status: 400 });
    }
    const values = body.post as Record<string, unknown>;
    const imagePost = { id: typeof body.id === "string" ? body.id : "new", title: String(values.title || ""), summary: String(values.summary || ""), body: String(values.body || ""), image_url: typeof values.image_url === "string" ? values.image_url : null, image_alt: typeof values.image_alt === "string" ? values.image_alt : null };
    const imageErrors = (await inspectPublicationImagesInDatabase([imagePost], supabase)).get(imagePost.id) || [];
    if (imageErrors.length) return NextResponse.json({ error: `Corrija as imagens antes de publicar: ${imageErrors.join(" ")}`, blockers: imageErrors }, { status: 422 });
    const { data, error } = await supabase.rpc("admin_save_editorial_post", { p_id: body.id || null, p_post: body.post });
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "40001" ? 409 : 500 });
    refreshPublicationPages();
    return NextResponse.json({ posts: data }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!body || !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 50
    || body.ids.some((id) => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    || new Set(body.ids).size !== body.ids.length || !["review", "publish"].includes(String(body.action))) {
    return NextResponse.json({ error: "Selecione de uma a cinquenta matérias distintas." }, { status: 400 });
  }
  const ids = body.ids as string[];
  if (body.action === "review") {
    const { data, error } = await supabase.from("posts").select("*").in("id", ids);
    if (error) return NextResponse.json({ error: "Não foi possível revisar a seleção." }, { status: 500 });
    const byId = new Map(((data || []) as Post[]).map((post) => [post.id, post]));
    if (ids.some((id) => !byId.has(id))) return NextResponse.json({ error: "Uma matéria não foi encontrada. Atualize a seleção." }, { status: 404 });
    const drafts = ids.map((id) => byId.get(id)!).filter((post) => !post.is_published);
    const imageChecks = await inspectPublicationImagesInDatabase(drafts, supabase);
    const posts = drafts.map((post) => ({
      id: post.id, slug: post.slug, title: post.title, summary: post.summary, category: post.category,
      image_url: post.image_url, image_alt: post.image_alt, author_name: post.author_name,
      is_published: post.is_published, published_at: post.published_at, created_at: post.created_at,
      updated_at: post.updated_at, scheduled_at: post.scheduled_at,
      warnings: [...new Set(validateStoredEditorialPost(post))],
      blockers: imageChecks.get(post.id) || [],
    }));
    return NextResponse.json({ posts, skipped: ids.length - posts.length }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!Array.isArray(body.reviewed) || body.reviewed.length !== ids.length) {
    return NextResponse.json({ error: "Revise as matérias e confirme os avisos antes de publicar." }, { status: 400 });
  }
  const reviewed = body.reviewed as Array<{ id?: unknown; updated_at?: unknown }>;
  if (reviewed.some((post, index) => !post || post.id !== ids[index] || typeof post.updated_at !== "string" || !Number.isFinite(Date.parse(post.updated_at)))) {
    return NextResponse.json({ error: "A revisão da seleção está inválida." }, { status: 400 });
  }
  const { data: current, error: readError } = await supabase.from("posts").select("*").in("id", ids);
  if (readError || current?.length !== ids.length) return NextResponse.json({ error: "Não foi possível conferir as imagens da seleção." }, { status: 503 });
  const imageChecks = await inspectPublicationImagesInDatabase(current as Post[], supabase);
  const imageErrors = (current as Post[]).flatMap((post) => (imageChecks.get(post.id) || []).map((error) => `${post.title}: ${error}`));
  if (imageErrors.length) return NextResponse.json({ error: `Corrija as imagens antes de publicar: ${imageErrors.join(" ")}`, blockers: imageErrors }, { status: 422 });
  const { data, error } = await supabase.rpc("admin_publish_posts", { p_post_ids: ids, p_expected_updated: reviewed.map((post) => post.updated_at) });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "40001" ? 409 : 500 });
  refreshPublicationPages();
  return NextResponse.json({ posts: data }, { headers: { "Cache-Control": "private, no-store" } });
}
