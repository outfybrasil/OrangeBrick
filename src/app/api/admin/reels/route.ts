import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isVerifiedAdminSession } from "@/lib/auth";
import type { Post } from "@/lib/types/database";
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

  const manifest = getManifest();

  const items: AdminReelItem[] = posts.map((post: Partial<Post>) => {
    const slug = post.slug || "";
    const fileInfo = checkReelFile(slug);
    const manifestItem = manifest[slug] as ReelManifestItem | undefined;

    let status: AdminReelItem["status"] = "pending";
    let videoUrl = fileInfo.url || manifestItem?.video_url;
    let fileSize = fileInfo.size || manifestItem?.file_size;
    let duration = manifestItem?.duration;
    let errorMsg = manifestItem?.error;

    if (fileInfo.exists) {
      status = "ready";
    } else if (manifestItem?.status === "generating") {
      const started = manifestItem.started_at ? new Date(manifestItem.started_at).getTime() : 0;
      if (Date.now() - started < 12 * 60 * 1000) {
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

  const { slug } = body;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Slug da matéria é obrigatório" }, { status: 400 });
  }

  const result = triggerReelGeneration(slug);

  return NextResponse.json(result);
}
