import { createReadStream } from "node:fs";
import path, { sep } from "node:path";
import { Readable } from "node:stream";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { checkReelFile } from "@/lib/video/reel-service";
import { getRemoteReels, REEL_BUCKET, usesRemoteReels } from "@/lib/video/reel-remote";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const auth = createClient(
    supabaseUrl,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );

  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !isVerifiedAdminSession(user, token)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const postId = new URL(request.url).searchParams.get("id");
  if (!postId || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(postId)) {
    return NextResponse.json({ error: "Matéria inválida." }, { status: 400 });
  }

  const editorial = createClient(
    supabaseUrl,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: post, error: postError } = await editorial
    .from("posts")
    .select("id,slug")
    .eq("id", postId)
    .maybeSingle();

  if (postError) return NextResponse.json({ error: "Não foi possível localizar o Reel." }, { status: 500 });
  if (!post) return NextResponse.json({ error: "Matéria não encontrada." }, { status: 404 });

  let body: ReadableStream<Uint8Array> | null = null;
  let contentLength: string | null = null;

  if (usesRemoteReels()) {
    try {
      const reel = (await getRemoteReels([post.id])).get(post.id);
      if (!reel?.video_url || reel.status !== "ready") {
        return NextResponse.json({ error: "O vídeo do Reel está indisponível." }, { status: 404 });
      }

      const videoUrl = new URL(reel.video_url);
      const storageOrigin = new URL(supabaseUrl).origin;
      if (videoUrl.origin !== storageOrigin || !videoUrl.pathname.startsWith(`/storage/v1/object/sign/${REEL_BUCKET}/`)) {
        return NextResponse.json({ error: "A origem do arquivo é inválida." }, { status: 502 });
      }

      const videoResponse = await fetch(videoUrl, { cache: "no-store", signal: request.signal });
      if (!videoResponse.ok || !videoResponse.body) {
        await videoResponse.body?.cancel();
        return NextResponse.json({ error: "Não foi possível buscar o arquivo do Reel." }, { status: 502 });
      }

      body = videoResponse.body;
      contentLength = videoResponse.headers.get("content-length");
    } catch {
      return NextResponse.json({ error: "Não foi possível preparar o download do Reel." }, { status: 502 });
    }
  } else {
    const reelFile = checkReelFile(post.slug);
    const reelsDirectory = path.resolve(process.cwd(), "public", "reels");
    const filePath = path.resolve(reelsDirectory, `${post.slug}.mp4`);
    if (!reelFile.exists || !filePath.startsWith(`${reelsDirectory}${sep}`)) {
      return NextResponse.json({ error: "O arquivo do Reel está indisponível." }, { status: 404 });
    }

    body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
    contentLength = reelFile.size ? String(reelFile.size) : null;
  }

  const filename = `${post.slug.replace(/[^a-zA-Z0-9_-]/g, "-")}.mp4`;
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (contentLength && /^\d+$/.test(contentLength)) headers.set("Content-Length", contentLength);

  return new Response(body, { headers });
}
