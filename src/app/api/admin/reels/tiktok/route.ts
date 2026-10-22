import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getReelAdmin } from "@/lib/video/reel-remote";
import { getSiteUrl } from "@/lib/site-url";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { beginSocialDelivery, finishSocialDelivery, type SocialDeliveryClaim } from "@/lib/video/reel-social-delivery";

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

async function resolveActiveTikTokAccount(apiKey: string, userId: string, fallbackId?: string): Promise<{ accountId?: string; hasUpload: boolean }> {
  try {
    const res = await fetch(`https://backend.composio.dev/api/v3.1/connected_accounts?user_uuid=${encodeURIComponent(userId)}`, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { accountId: fallbackId, hasUpload: false };
    const json = await res.json();
    const rawItems = (json?.items || []) as Array<{ id: string; status: string; toolkit?: { slug?: string }; appName?: string; scope?: string; data?: { scope?: string }; params?: { scope?: string } }>;
    const items = rawItems.filter(i => (i.toolkit?.slug === "tiktok" || i.appName === "tiktok"));

    const activeWithUpload = items.find(i => {
      const scope = i.scope || i.data?.scope || i.params?.scope || "";
      return i.status === "ACTIVE" && scope.includes("video.upload");
    });
    if (activeWithUpload) {
      return { accountId: activeWithUpload.id, hasUpload: true };
    }
    const activeAny = items.find(i => i.status === "ACTIVE");
    const scope = activeAny?.scope || activeAny?.data?.scope || activeAny?.params?.scope || "";
    return { accountId: activeAny?.id || fallbackId, hasUpload: scope.includes("video.upload") };
  } catch {
    return { accountId: fallbackId, hasUpload: false };
  }
}

export async function GET(request: Request) {
  try {
    const automatic = isAuthorizedCronRequest(request);
    if (!automatic && !await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }

    const url = new URL(request.url);
    if (automatic && url.searchParams.get("action") !== "status") return reply({ error: "Consulta automatica invalida." }, 403);
    const apiKey = process.env.COMPOSIO_API_KEY;
    const authConfigId = process.env.COMPOSIO_TIKTOK_AUTH_CONFIG || "ac_wVLrwhnpKQqe";
    const composioUserId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";

    if (url.searchParams.get("action") === "status") {
      const publishId = url.searchParams.get("publishId") || "";
      if (!/^[\w~.-]{1,100}$/.test(publishId) || !apiKey) return reply({ error: "Envio do TikTok inválido ou integração indisponível." }, 400);
      const account = await resolveActiveTikTokAccount(apiKey, composioUserId, process.env.COMPOSIO_TIKTOK_ACCOUNT);
      if (!account.accountId) return reply({ error: "Conta TikTok indisponível." }, 503);
      const statusResponse = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ connected_account_id: account.accountId, user_id: composioUserId, endpoint: "https://open.tiktokapis.com/v2/post/publish/status/fetch/", method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: { publish_id: publishId } }),
        signal: AbortSignal.timeout(30_000),
      });
      const statusText = await statusResponse.text();
      const statusData = (() => { try { return JSON.parse(statusText); } catch { return null; } })();
      const result = statusData?.data?.data || statusData?.data;
      if (!statusResponse.ok || result?.error?.code && result.error.code !== "ok" || typeof result?.status !== "string") return reply({ error: "O TikTok não confirmou o estado da publicação." }, 503);
      const ids = statusText.match(/"publicaly_available_post_id"\s*:\s*\[([^\]]*)\]/)?.[1] || "";
      const postIds = [...ids.matchAll(/"?(\d{15,25})"?/g)].map(match => match[1]);
      return reply({ status: result.status, reason: result.fail_reason || null, postIds });
    }

    if (url.searchParams.get("action") === "link") {
      if (!apiKey) return reply({ error: "Composio não configurado." }, 400);

      const linkRes = await fetch("https://backend.composio.dev/api/v3.1/connected_accounts/link", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ auth_config_id: authConfigId, user_id: composioUserId }),
        signal: AbortSignal.timeout(15_000),
      });
      const linkJson = await linkRes.json().catch(() => null);
      if (!linkRes.ok || !linkJson?.redirect_url) {
        return reply({ error: linkJson?.error?.message || "Não foi possível gerar link de conexão." }, 400);
      }
      return reply({
        redirectUrl: linkJson.redirect_url,
        connectedAccountId: linkJson.connected_account_id,
      });
    }

    let hasUpload = false;
    let resolvedAccountId = process.env.COMPOSIO_TIKTOK_ACCOUNT;

    if (apiKey) {
      const resolved = await resolveActiveTikTokAccount(apiKey, composioUserId, resolvedAccountId);
      hasUpload = resolved.hasUpload;
      if (resolved.accountId) resolvedAccountId = resolved.accountId;
    }

    const composioConfigured = Boolean(apiKey && resolvedAccountId);
    const hasEnvToken = Boolean(process.env.TIKTOK_ACCESS_TOKEN || composioConfigured);

    return reply({
      configured: hasEnvToken || composioConfigured,
      hasEnvToken,
      composioConfigured,
      hasUpload,
      accountId: resolvedAccountId,
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
  let deliveryClaim: SocialDeliveryClaim | null = null;
  try {
    const automatic = isAuthorizedCronRequest(request);
    if (!automatic && !await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || automatic && body.autoPublic !== true || typeof body.videoUrl !== "string" || !body.videoUrl.trim()) {
      return reply({ error: "URL do vídeo é obrigatória." }, 400);
    }

    deliveryClaim = await beginSocialDelivery(body.postId, "tiktok", { automatic, repost: body.repost === true && body.confirmed === true });
    if (!deliveryClaim) return reply({ error: "Este Reel já tem um envio no TikTok. Confira os rascunhos antes de repetir.", deliveryStatus: "unknown" }, 409);

    const fail = async (error: string, statusCode: number, deliveryStatus: "failed" | "unknown" = "failed") => {
      if (deliveryClaim) await finishSocialDelivery(deliveryClaim, deliveryStatus, null, error);
      return reply({ error, deliveryStatus }, statusCode);
    };

    const apiKey = process.env.COMPOSIO_API_KEY;
    const composioUserId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";
    const manualAccessToken = body.accessToken?.trim() || process.env.TIKTOK_ACCESS_TOKEN || "";

    let accountId = process.env.COMPOSIO_TIKTOK_ACCOUNT;
    let hasUpload = false;
    if (apiKey) {
      const resolved = await resolveActiveTikTokAccount(apiKey, composioUserId, accountId);
      if (resolved.accountId) accountId = resolved.accountId;
      hasUpload = resolved.hasUpload;
    }

    const useComposio = Boolean(apiKey && accountId && hasUpload);
    const customAccessToken = useComposio ? "" : manualAccessToken;
    if (!useComposio && !customAccessToken && apiKey && accountId) return fail("A conta TikTok não autorizou o envio de rascunhos. Reconecte com o escopo video.upload.", 400);

    if (!useComposio && !customAccessToken) {
      return fail("Token do TikTok não configurado. Informe o Access Token do TikTok ou configure COMPOSIO_TIKTOK_ACCOUNT.", 400);
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
      return fail(`Não foi possível carregar o vídeo para envio (${videoFetchRes.status}).`, 400);
    }
    const videoArrayBuffer = await videoFetchRes.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    const videoSize = videoBuffer.length;
    if (videoSize === 0) {
      return fail("Arquivo de vídeo vazio.", 400);
    }

    let chunkSize = videoSize;
    let totalChunkCount = 1;
    if (videoSize > 64_000_000) {
      chunkSize = 10_000_000;
      totalChunkCount = Math.floor(videoSize / chunkSize);
    }

    const payload = {
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

    const endpoints = [{ url: "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/" }];

    if (apiKey && accountId && !customAccessToken) {
      for (const ep of endpoints) {
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
              endpoint: ep.url,
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
          lastError = err instanceof Error ? err.message : "Erro na chamada do Composio";
        }
      }
    } else if (customAccessToken) {
      for (const ep of endpoints) {
        try {
          const response = await fetch(ep.url, {
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
      const message = lastError || "Falha ao iniciar envio para o TikTok.";
      return fail(message, 400);
    }

    await uploadChunks(uploadUrl, videoBuffer, chunkSize, totalChunkCount);

    const deliveryStatus = publishId && publishId !== "ok" ? "submitted" : "unknown";
    await finishSocialDelivery(deliveryClaim, deliveryStatus, publishId);

    return reply({
      success: true,
      publishId,
      isDirect: false,
      deliveryStatus,
      message: "Vídeo enviado para a caixa de entrada do TikTok. Abra a notificação no aplicativo, revise a legenda e finalize a publicação.",
    });
  } catch (error) {
    if (deliveryClaim) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao postar no TikTok.";
      await finishSocialDelivery(deliveryClaim, "unknown", null, message).catch(() => {});
    }
    return reply({
      error: error instanceof Error ? error.message : "Erro inesperado ao postar no TikTok.",
      ...(deliveryClaim ? { deliveryStatus: "unknown" } : {}),
    }, 500);
  }
}
