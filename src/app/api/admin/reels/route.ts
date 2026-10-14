import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import type { Post } from "@/lib/types/database";
import { getRemoteReels, usesRemoteReels } from "@/lib/video/reel-remote";
import {
  getManifest,
  checkReelFile,
  generateSocialCopys,
  triggerReelGeneration,
  type ReelManifestItem,
  type SocialCopys,
} from "@/lib/video/reel-service";

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
  finished_at?: string;
  error?: string;
  copys: SocialCopys;
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
      started_at: job.started_at || job.created_at,
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
      if (Date.now() - started < (remote ? 60 : 12) * 60 * 1000) {
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
      finished_at: manifestItem?.finished_at,
      error: errorMsg,
      copys,
    };
  });

  return NextResponse.json(
    { items },
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

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
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
