import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getReelAdmin } from "@/lib/video/reel-remote";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const maxDuration = 180;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user }, error } = await getReelAdmin().auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token);
}

export async function GET(request: Request) {
  try {
    if (!await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }
    const composioConfigured = Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_TIKTOK_ACCOUNT);
    const hasEnvToken = Boolean(process.env.TIKTOK_ACCESS_TOKEN || composioConfigured);
    return reply({
      configured: hasEnvToken || composioConfigured,
      hasEnvToken,
      composioConfigured,
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Erro ao consultar status do TikTok." }, 500);
  }
}

async function uploadChunks(uploadUrl: string, buffer: Buffer, chunkSize: number, totalChunks: number) {
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = (i === totalChunks - 1) ? buffer.length - 1 : (start + chunkSize - 1);
    const chunk = buffer.subarray(start, end + 1);

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
        "Content-Length": String(chunk.length),
      },
      body: new Uint8Array(chunk),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok && res.status !== 206 && res.status !== 201) {
      const text = await res.text().catch(() => "");
      throw new Error(`Falha no upload do vídeo para o TikTok (${res.status}): ${text.slice(0, 200)}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    if (!await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.videoUrl !== "string" || !body.videoUrl.trim()) {
      return reply({ error: "URL do vídeo é obrigatória." }, 400);
    }

    const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 2200) : "";
    const apiKey = process.env.COMPOSIO_API_KEY;
    const accountId = process.env.COMPOSIO_TIKTOK_ACCOUNT;
    const composioUserId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";
    const customAccessToken = body.accessToken?.trim() || process.env.TIKTOK_ACCESS_TOKEN;

    if (!customAccessToken && (!apiKey || !accountId)) {
      return reply({
        error: "Token do TikTok não configurado. Informe o Access Token do TikTok ou configure COMPOSIO_TIKTOK_ACCOUNT.",
      }, 400);
    }

    let absoluteVideoUrl = body.videoUrl.trim();
    if (absoluteVideoUrl.startsWith("/")) {
      const siteUrl = getSiteUrl();
      absoluteVideoUrl = `${siteUrl}${absoluteVideoUrl}`;
    }

    const videoFetchRes = await fetch(absoluteVideoUrl, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!videoFetchRes.ok) {
      return reply({
        error: `Não foi possível carregar o vídeo para envio (${videoFetchRes.status}).`,
      }, 400);
    }
    const videoArrayBuffer = await videoFetchRes.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    const videoSize = videoBuffer.length;
    if (videoSize === 0) {
      return reply({ error: "Arquivo de vídeo vazio." }, 400);
    }

    let chunkSize = videoSize;
    let totalChunkCount = 1;
    if (videoSize > 64_000_000) {
      chunkSize = 10_000_000;
      totalChunkCount = Math.floor(videoSize / chunkSize);
    }

    const privacyLevel = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"].includes(body.privacyLevel)
      ? body.privacyLevel
      : "PUBLIC_TO_EVERYONE";

    const payload = {
      post_info: {
        title: caption,
        privacy_level: privacyLevel,
        disable_duet: Boolean(body.disableDuet),
        disable_comment: Boolean(body.disableComment),
        disable_stitch: Boolean(body.disableStitch),
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    };

    let publishId: string | null = null;
    let uploadUrl: string | null = null;
    let lastError: string | null = null;

    if (apiKey && accountId && !customAccessToken) {
      for (const endpoint of [
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      ]) {
        try {
          const proxyRes = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              connected_account_id: accountId,
              user_id: composioUserId,
              endpoint,
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=UTF-8",
              },
              body: payload,
            }),
            signal: AbortSignal.timeout(45_000),
          });

          const proxyJson = await proxyRes.json().catch(() => null);
          const inner = proxyJson?.data;
          const foundPublishId = inner?.data?.publish_id || inner?.publish_id || proxyJson?.data?.publish_id;
          const foundUploadUrl = inner?.data?.upload_url || inner?.upload_url || proxyJson?.data?.upload_url;

          if (proxyRes.ok && foundUploadUrl) {
            publishId = foundPublishId || "ok";
            uploadUrl = foundUploadUrl;
            break;
          }

          if (inner?.error?.message) {
            lastError = inner.error.message;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Erro ao conectar com Composio";
        }
      }
    } else if (customAccessToken) {
      for (const endpoint of [
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
      ]) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${customAccessToken}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30_000),
          });

          const data = await response.json().catch(() => null);
          if (response.ok && data?.data?.upload_url) {
            publishId = data.data.publish_id || "ok";
            uploadUrl = data.data.upload_url;
            break;
          }
          if (data?.error?.message) {
            lastError = data.error.message;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Erro na requisição ao TikTok";
        }
      }
    }

    if (!uploadUrl) {
      return reply({
        error: lastError || "Falha ao iniciar envio para o TikTok. Verifique as permissões da conta.",
      }, 400);
    }

    await uploadChunks(uploadUrl, videoBuffer, chunkSize, totalChunkCount);

    return reply({
      success: true,
      publishId,
      message: "Vídeo enviado com sucesso para o TikTok!",
    });
  } catch (error) {
    return reply({
      error: error instanceof Error ? error.message : "Erro inesperado ao postar no TikTok.",
    }, 500);
  }
}
