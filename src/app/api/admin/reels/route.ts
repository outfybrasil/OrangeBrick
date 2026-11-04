import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import type { Post, ReelYouTubePublication } from "@/lib/types/database";
import { getRemoteReels, usesRemoteReels } from "@/lib/video/reel-remote";
import {
  getManifest,
  checkReelFile,
  generateSocialCopys,
  triggerReelGeneration,
  cancelReel,
  getLocalReelQueueStatus,
  getLongVideoManifest,
  getDarkPipelineConfig,
  saveDarkPipelineConfig,
  triggerLongVideoGeneration,
  updateLongVideoItem,
  VALID_LONG_VIDEO_STYLES,
  type ReelManifestItem,
  type SocialCopys,
  type LongVideoManifestItem,
  type LongVideoVisualStyle,
  type DarkPipelineConfig,
} from "@/lib/video/reel-service";
import type { ReelSocialPublication, ReelSocialPlatform, ReelSocialStatus } from "@/lib/video/reel-social-delivery";

export const runtime = "nodejs";

export interface AdminReelItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  status: "ready" | "generating" | "failed" | "pending";
  video_url?: string;
  reel_job_id?: string;
  duration?: number;
  file_size?: number;
  started_at?: string;
  queued_at?: string;
  finished_at?: string;
  error?: string;
  is_queued?: boolean;
  queue_position?: number;
  attempts?: number;
  expected_duration_seconds?: number;
  estimated_remaining_seconds?: number;
  eta_updated_at?: string;
  copys: SocialCopys;
  socialPublications: Partial<Record<ReelSocialPlatform, ReelSocialPublication>>;
}

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const editorial = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: posts, error: postsError } = await editorial
    .from("posts")
    .select("id, slug, title, summary, category, image_url, is_published, published_at, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (postsError || !posts) {
    return NextResponse.json({ error: "Erro ao buscar matérias" }, { status: 500 });
  }

  const { data: socialRows, error: socialError } = posts.length
    ? await editorial.from("reel_social_publications").select("post_id,platform,status,external_id,error,updated_at").in("post_id", posts.map((post) => post.id))
    : { data: [], error: null };

  if (socialError) {
    return NextResponse.json({ error: "Erro ao buscar o status das publicações sociais." }, { status: 500 });
  }

  const socialByPostId = new Map<string, Partial<Record<ReelSocialPlatform, ReelSocialPublication>>>();
  for (const row of socialRows || []) {
    if (row.platform !== "instagram" && row.platform !== "tiktok" && row.platform !== "youtube") continue;
    const platform = row.platform as ReelSocialPlatform;
    const publications = socialByPostId.get(row.post_id) || {};
    publications[platform] = row as ReelSocialPublication;
    socialByPostId.set(row.post_id, publications);
  }

  const { data: youtubeRows, error: youtubeError } = posts.length
    ? await editorial.from("reel_youtube_publications").select("post_id,status,visibility,video_id,error,updated_at").in("post_id", posts.map((post) => post.id)).order("updated_at", { ascending: false })
    : { data: [], error: null };

  if (youtubeError) {
    return NextResponse.json({ error: "Erro ao buscar o histórico de publicação do YouTube." }, { status: 500 });
  }

  const youtubePosts = new Set<string>();
  for (const row of youtubeRows || []) {
    if (youtubePosts.has(row.post_id)) continue;
    youtubePosts.add(row.post_id);
    const youtube = row as Pick<ReelYouTubePublication, "status" | "visibility" | "video_id" | "error" | "updated_at">;
    const status: ReelSocialStatus = youtube.status === "uploaded"
      ? youtube.visibility === "public" ? "published" : "submitted"
      : youtube.status === "preparing" || youtube.status === "uploading" ? "processing"
        : youtube.status === "failed" ? "failed" : "unknown";
    const publications = socialByPostId.get(row.post_id) || {};
    publications.youtube = {
      platform: "youtube",
      status,
      external_id: youtube.video_id,
      error: youtube.error,
      updated_at: youtube.updated_at,
      visibility: youtube.visibility,
    };
    socialByPostId.set(row.post_id, publications);
  }

  const remote = usesRemoteReels();
  let remoteReels: Awaited<ReturnType<typeof getRemoteReels>> = new Map();
  if (remote) {
    try {
      remoteReels = await getRemoteReels(posts.map((post) => post.id));
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao consultar Reels." }, { status: 503 });
    }
  }
  const manifest = remote ? {} : getManifest();
  let activeQueue: Array<{ id: string; post_id: string; status: string; attempts: number; created_at: string; started_at: string | null }> = [];
  let expectedDurationSeconds = 12 * 60;
  if (remote) {
    const [queueResult, historyResult] = await Promise.all([
      editorial.from("reel_jobs").select("id,post_id,status,attempts,created_at,started_at").in("status", ["queued", "running"]).order("created_at", { ascending: true }),
      editorial.from("reel_jobs").select("started_at,finished_at").eq("status", "ready").order("finished_at", { ascending: false }).limit(15),
    ]);
    activeQueue = (queueResult.data || []) as typeof activeQueue;
    const durations = (historyResult.data || [])
      .filter((job) => job.started_at && job.finished_at)
      .map((job) => (new Date(job.finished_at!).getTime() - new Date(job.started_at!).getTime()) / 1000)
      .filter((duration) => Number.isFinite(duration) && duration > 0 && duration <= 60 * 60)
      .sort((a, b) => a - b);
    if (durations.length) expectedDurationSeconds = durations[Math.floor(durations.length / 2)];
  }
  const etaUpdatedAt = new Date().toISOString();
  const activeRunningJob = activeQueue.find((candidate) => candidate.status === "running");
  const activeRunningElapsedSeconds = activeRunningJob?.started_at
    ? Math.max(0, (Date.now() - new Date(activeRunningJob.started_at).getTime()) / 1000)
    : 0;

  const items: AdminReelItem[] = posts.map((post: Partial<Post>) => {
    const slug = post.slug || "";
    const job = remoteReels.get(post.id || "");
    const fileInfo = remote ? { exists: false, url: undefined, size: undefined } : checkReelFile(slug);
    const manifestItem: ReelManifestItem | undefined = job ? {
      slug,
      status: job.status === "queued" || job.status === "running" ? "generating" : job.status === "skipped" ? "failed" : job.status,
      video_url: job.video_url,
      duration: job.duration ?? undefined,
      file_size: job.file_size ?? undefined,
      started_at: job.started_at ?? undefined,
      queued_at: job.status === "queued" ? job.created_at : undefined,
      finished_at: job.finished_at ?? undefined,
      error: job.error ?? undefined,
      script: job.script as unknown as ReelManifestItem["script"],
    } : manifest[slug];

    let status: AdminReelItem["status"] = "pending";
    const videoUrl = fileInfo.url || manifestItem?.video_url;
    const fileSize = fileInfo.size || manifestItem?.file_size;
    const duration = manifestItem?.duration;
    let errorMsg = manifestItem?.error;

    if (job?.status === "ready" && !videoUrl) {
      status = "failed";
      errorMsg = "O vídeo está indisponível no armazenamento. Gere novamente.";
    } else if (fileInfo.exists || (job?.status === "ready" && videoUrl)) {
      status = "ready";
    } else if (manifestItem?.status === "generating") {
      const started = manifestItem.started_at ? new Date(manifestItem.started_at).getTime() : 0;
      let processRunning = true;
      if (!remote && manifestItem.pid) {
        try { process.kill(manifestItem.pid, 0); }
        catch { processRunning = false; }
      }
      if (remote && job?.status === "queued") {
        status = "generating";
      } else if (!processRunning) {
        status = "failed";
        errorMsg = "O processo de renderização foi encerrado. Gere o Reel novamente.";
      } else if (Date.now() - started < 60 * 60 * 1000) {
        status = "generating";
      } else {
        status = "failed";
        errorMsg = "Tempo limite de renderização excedido.";
      }
    } else if (manifestItem?.status === "failed") {
      status = "failed";
    }

    const copys = generateSocialCopys({
      title: post.title || "",
      summary: post.summary || "",
      slug,
      category: post.category || "breaking",
      script: manifestItem?.script,
    });
    const localProgress = remote ? null : getLocalReelQueueStatus(slug, manifest);
    const queueIndex = job ? activeQueue.findIndex((candidate) => candidate.id === job.id) : -1;
    const queuePosition = remote
      ? queueIndex >= 0 ? queueIndex + 1 : undefined
      : localProgress?.queuePosition;
    const isQueued = remote ? job?.status === "queued" : localProgress?.isQueued;
    const etaSeconds = remote
      ? queuePosition ? Math.max(0, queuePosition * expectedDurationSeconds - activeRunningElapsedSeconds) : undefined
      : localProgress?.estimatedRemainingSeconds;

    return {
      id: post.id || slug,
      slug,
      title: post.title || "",
      summary: post.summary || "",
      category: post.category || "breaking",
      image_url: post.image_url || null,
      is_published: !!post.is_published,
      published_at: post.published_at || null,
      created_at: post.created_at || "",
      status,
      video_url: videoUrl,
      reel_job_id: job?.id,
      duration,
      file_size: fileSize,
      started_at: manifestItem?.started_at,
      queued_at: job?.status === "queued" ? job.created_at : manifestItem?.queued_at,
      finished_at: manifestItem?.finished_at,
      error: errorMsg,
      is_queued: !!isQueued,
      queue_position: queuePosition,
      attempts: job?.attempts,
      expected_duration_seconds: remote ? expectedDurationSeconds : localProgress?.expectedDurationSeconds,
      estimated_remaining_seconds: etaSeconds,
      eta_updated_at: etaSeconds === undefined ? undefined : etaUpdatedAt,
      copys,
      socialPublications: socialByPostId.get(post.id || "") || {},
    };
  });

  const rawLongManifest = typeof getLongVideoManifest === "function" ? getLongVideoManifest() : {};
  const longVideos: LongVideoManifestItem[] = Object.values(rawLongManifest).sort(
    (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
  );
  if (longVideos.length > 0 && editorial.storage && typeof editorial.storage.from === "function") {
    try {
      const storagePaths = longVideos.map((v) => `long-videos/${v.slug}/${v.slug}.mp4`);
      const { data: signedLong } = await editorial.storage.from("editorial-reels").createSignedUrls(storagePaths, 3600);
      const signedByPath = new Map<string, string>();
      for (const entry of signedLong || []) {
        if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
      }
      for (const video of longVideos) {
        const signedUrl = signedByPath.get(`long-videos/${video.slug}/${video.slug}.mp4`);
        if (signedUrl) {
          video.video_url = signedUrl;
        }
      }
    } catch {}
  }
  const darkConfig: DarkPipelineConfig | null = typeof getDarkPipelineConfig === "function" ? getDarkPipelineConfig() : null;

  return NextResponse.json(
    { items, longVideos, darkConfig },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  if (body?.pipeline === "long") {
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "config") {
      const updated = saveDarkPipelineConfig((body.config as Partial<DarkPipelineConfig>) || {});
      return NextResponse.json({ success: true, darkConfig: updated });
    }

    const attachSignedLongVideoUrl = async (item: LongVideoManifestItem | null) => {
      if (!item) return null;
      try {
        const editorial = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        if (editorial.storage && typeof editorial.storage.from === "function") {
          const { data: signed } = await editorial.storage
            .from("editorial-reels")
            .createSignedUrl(`long-videos/${item.slug}/${item.slug}.mp4`, 3600);
          if (signed?.signedUrl) {
            item.video_url = signed.signedUrl;
          }
        }
      } catch {}
      return item;
    };

    if (action === "review") {
      const slug = typeof body.slug === "string" ? body.slug : "";
      const decision = body.decision === "approve" ? "approved" : "rejected";
      const notes = typeof body.review_notes === "string" ? body.review_notes.trim() : null;
      const thumbId = typeof body.selected_thumbnail_id === "string" ? body.selected_thumbnail_id : undefined;
      const updated = await attachSignedLongVideoUrl(
        updateLongVideoItem(slug, {
          status: decision,
          review_notes: notes,
          approved_at: decision === "approved" ? new Date().toISOString() : null,
          ...(thumbId ? { selected_thumbnail_id: thumbId } : {}),
        })
      );
      if (!updated) return NextResponse.json({ error: "Episódio longo não encontrado." }, { status: 404 });
      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "schedule") {
      const slug = typeof body.slug === "string" ? body.slug : "";
      const scheduledAt = typeof body.scheduled_at === "string" ? body.scheduled_at : new Date(Date.now() + 3600_000).toISOString();
      const visibility = body.visibility === "public" || body.visibility === "unlisted" ? body.visibility : "private";
      const current = getLongVideoManifest()[slug];
      if (!current) return NextResponse.json({ error: "Episódio longo não encontrado." }, { status: 404 });
      if (current.status !== "approved" && current.status !== "scheduled") {
        return NextResponse.json({ error: "Aprove o episódio no painel de revisão antes de agendar no YouTube." }, { status: 400 });
      }
      const updated = await attachSignedLongVideoUrl(
        updateLongVideoItem(slug, {
          status: "scheduled",
          youtube: {
            ...current.youtube,
            scheduled_at: scheduledAt,
            visibility,
          },
        })
      );
      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "create") {
      const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
      if (!rawTitle || rawTitle.length < 6) {
        return NextResponse.json({ error: "Informe um título para o episódio longo (mínimo de 6 caracteres)." }, { status: 400 });
      }
      const slug = (typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : rawTitle)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 110);
      const subtitle = typeof body.subtitle === "string" && body.subtitle.trim()
        ? body.subtitle.trim()
        : `Dossiê investigativo Orange Brick sobre ${rawTitle}.`;
      const sourceMode = body.source_mode === "custom_script" ? "custom_script" : "ai_dossier";
      const sourcePostSlugs = Array.isArray(body.source_post_slugs)
        ? body.source_post_slugs.filter((s): s is string => typeof s === "string")
        : [];
      const customScriptText = typeof body.custom_script_text === "string" ? body.custom_script_text.trim() : undefined;
      if (sourceMode === "custom_script" && (!customScriptText || customScriptText.split(/\s+/).length < 60)) {
        return NextResponse.json({ error: "Cole um roteiro com pelo menos 60 palavras para dividir em cenas." }, { status: 400 });
      }
      if (sourceMode === "ai_dossier" && sourcePostSlugs.length === 0) {
        return NextResponse.json({ error: "Selecione pelo menos 1 matéria do catálogo para compilar o dossiê." }, { status: 400 });
      }
      const styleRaw = typeof body.visual_style === "string" ? body.visual_style : "documentario";
      const allowedStyles = Array.isArray(VALID_LONG_VIDEO_STYLES)
        ? VALID_LONG_VIDEO_STYLES
        : ["documentario", "cinema", "arquivo-cofre", "circuito", "tribunal", "mesa-de-risco", "turno-da-madrugada", "linha-do-tempo", "raio-x", "duelo", "manchete", "impacto"];
      const visualStyle = (allowedStyles.includes(styleRaw as LongVideoVisualStyle)
        ? styleRaw
        : "documentario") as LongVideoVisualStyle;
      const voiceId = typeof body.voice_id === "string" && body.voice_id ? body.voice_id : "pt-BR-AntonioNeural";
      const targetMinMinutes = typeof body.target_min_minutes === "number" && body.target_min_minutes >= 8 ? body.target_min_minutes : 8;

      const created = triggerLongVideoGeneration({
        slug,
        title: rawTitle,
        subtitle,
        sourceMode,
        sourcePostSlugs,
        customScriptText,
        visualStyle,
        voiceId,
        targetMinMinutes,
      });

      return NextResponse.json({
        queued: true,
        message: "Produção do episódio longo iniciada na esteira.",
        item: created,
      }, { status: 202 });
    }

    return NextResponse.json({ error: "Ação inválida no pipeline de vídeo longo." }, { status: 400 });
  }

  const slug = body?.slug;
  if (typeof slug !== "string" || slug.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "Slug da matéria é obrigatório" }, { status: 400 });
  }

  try {
    const result = await triggerReelGeneration(slug);
    return NextResponse.json(result, { status: result.queued ? 202 : 409 });
  } catch (error) {
    console.error("[Reels] Falha ao iniciar geração:", error);
    return NextResponse.json({ queued: false, error: error instanceof Error ? error.message : "Não foi possível iniciar a geração do Reel. Tente novamente." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const slug = body?.slug;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Slug da matéria é obrigatório" }, { status: 400 });
  }

  try {
    const result = await cancelReel(slug);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Reels] Falha ao cancelar geração:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao cancelar geração." },
      { status: 500 }
    );
  }
}

