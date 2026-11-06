import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getLongVideoManifest, saveLongVideoManifest } from "@/lib/video/reel-service";
import { mergeVideoManifests, type LibraryVideo, type VideoVariant } from "@/lib/video/long-video-library";

export const runtime = "nodejs";

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token);
}

function storage() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from("editorial-reels");
}

async function loadLibrary() {
  const bucket = storage();
  const local = getLongVideoManifest() as Record<string, LibraryVideo>;
  const [{ data: state, error: stateError }, { data: deleted, error: deletedError }] = await Promise.all([bucket.download("long-videos/manifest-state.mp4"), bucket.download("long-videos/deleted-slugs.mp4")]);
  if (stateError && !/not.?found|does not exist/i.test(stateError.message)) throw new Error("Não foi possível consultar os vídeos salvos. Tente atualizar novamente.");
  if (deletedError && !/not.?found|does not exist/i.test(deletedError.message)) throw new Error("Não foi possível consultar o arquivo da biblioteca.");
  const remote = state ? JSON.parse(await state.text()) : {};
  const manifest = mergeVideoManifests(local, remote);
  const removed: string[] = deleted ? JSON.parse(await deleted.text()) : [];
  for (const slug of removed) delete manifest[slug];
  return { bucket, manifest };
}

export async function GET(request: Request) {
  if (!await authorized(request)) return NextResponse.json({ error: "Faça login como administrador e confirme a autenticação em duas etapas." }, { status: 403 });
  try {
    const { bucket, manifest } = await loadLibrary();
    const videos = Object.values(manifest).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    const variants: VideoVariant[] = ["full", "no_narration", "clean", "srt"];
    const paths = videos.flatMap(video => variants.map(variant => `long-videos/${video.slug}/${video.slug}${variant === "srt" ? ".srt" : variant === "no_narration" ? "-sem-narracao.mp4" : variant === "clean" ? "-sem-narracao-sem-legenda.mp4" : ".mp4"}`));
    const { data: signed, error } = paths.length ? await bucket.createSignedUrls(paths, 3600) : { data: [], error: null };
    if (error) throw new Error("Não foi possível preparar os arquivos dos vídeos. Tente atualizar novamente.");
    const urls = new Map((signed || []).filter(entry => entry.path && entry.signedUrl && !entry.error).map(entry => [entry.path!, entry.signedUrl]));
    for (const video of videos) {
      video.available_variants = [];
      for (const variant of variants) {
        const relative = `long-videos/${video.slug}/${video.slug}${variant === "srt" ? ".srt" : variant === "no_narration" ? "-sem-narracao.mp4" : variant === "clean" ? "-sem-narracao-sem-legenda.mp4" : ".mp4"}`;
        const localExists = fs.existsSync(path.join(process.cwd(), "public", relative));
        const url = urls.get(relative) || (localExists ? `/${relative}` : undefined);
        if (!url) continue;
        video.available_variants.push(variant);
        if (variant === "full") video.video_url = url;
        if (variant === "no_narration") video.video_no_narration_url = url;
        if (variant === "clean") video.video_no_narration_clean_url = url;
        if (variant === "srt") video.srt_url = url;
      }
    }
    return NextResponse.json({ videos }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a biblioteca." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!await authorized(request)) return NextResponse.json({ error: "Sessão expirada ou sem acesso. Entre novamente." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Envie os dados do vídeo em um formulário válido." }, { status: 400 });
    const { bucket, manifest } = await loadLibrary();
    const current = typeof body.slug === "string" ? manifest[body.slug] : undefined;
    if (!current) return NextResponse.json({ error: "Vídeo não encontrado. Atualize a biblioteca." }, { status: 404 });
    if (body.updated_at !== current.updated_at) return NextResponse.json({ error: "Este vídeo mudou desde que você o abriu. Atualize antes de salvar." }, { status: 409 });
    const next = { ...current, updated_at: new Date().toISOString() };
    if (body.action === "metadata") {
      if (current.youtube.video_id) return NextResponse.json({ error: "Este vídeo já foi enviado. Edite os dados no YouTube Studio para manter a publicação sincronizada." }, { status: 409 });
      if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 100 || /[<>]/.test(body.title) || typeof body.description !== "string" || body.description.length > 5000 || /[<>]/.test(body.description) || !Array.isArray(body.tags) || body.tags.some((tag: unknown) => typeof tag !== "string") || body.tags.join(",").length > 500) return NextResponse.json({ error: "Confira título (até 100 caracteres), descrição (até 5.000) e tags (até 500 caracteres)." }, { status: 400 });
      if (body.selected_thumbnail_id && !current.thumbnails.some(thumb => thumb.id === body.selected_thumbnail_id)) return NextResponse.json({ error: "Escolha uma miniatura disponível para este vídeo." }, { status: 400 });
      next.youtube = { ...current.youtube, title: body.title.trim(), description: body.description, tags: body.tags.map((tag: string) => tag.trim()).filter(Boolean) };
      next.selected_thumbnail_id = body.selected_thumbnail_id || current.selected_thumbnail_id;
    } else if (body.action === "review") {
      if (typeof body.notes !== "string" || body.notes.length > 10000) return NextResponse.json({ error: "As notas devem ter até 10.000 caracteres." }, { status: 400 });
      if (body.decision && (current.youtube.video_id || current.status === "generating")) return NextResponse.json({ error: "O estado deste vídeo não permite alterar a aprovação." }, { status: 409 });
      if (body.decision && !["approved", "rejected"].includes(body.decision)) return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
      if (body.decision === "rejected" && !body.notes.trim()) return NextResponse.json({ error: "Descreva o ajuste necessário antes de solicitar alterações." }, { status: 400 });
      next.review_notes = body.notes.trim();
      if (body.decision) { next.status = body.decision; next.approved_at = body.decision === "approved" ? new Date().toISOString() : null; }
    } else return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    const kind = body.action === "metadata" ? "metadata" : body.decision === "approved" ? "approved" : body.decision === "rejected" ? "changes_requested" : "notes";
    const detail = kind === "metadata" ? "Dados de publicação atualizados no painel." : kind === "approved" ? "Aprovação registrada para esta versão." : kind === "changes_requested" ? "Ajustes solicitados nesta versão." : "Notas de revisão atualizadas.";
    next.review_history = [...(current.review_history || []), { id: crypto.randomUUID(), kind, at: next.updated_at, detail }];
    manifest[current.slug] = next;
    const { error } = await bucket.upload("long-videos/manifest-state.mp4", Buffer.from(JSON.stringify(manifest)), { contentType: "video/mp4", upsert: true });
    if (error) throw new Error("Não foi possível salvar. Suas alterações continuam no formulário; tente novamente.");
    saveLongVideoManifest(manifest);
    return NextResponse.json({ item: next });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as alterações." }, { status: 503 });
  }
}
