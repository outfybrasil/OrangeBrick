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

async function resolveTikTokComposio(): Promise<{ token?: string }> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const accountId = process.env.COMPOSIO_TIKTOK_ACCOUNT;
  if (!apiKey || !accountId) return {};
  try {
    const res = await fetch(`https://backend.composio.dev/api/v3.1/connected_accounts/${encodeURIComponent(accountId)}`, {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const json = await res.json();
    const data = (json?.data || json?.connection_data || json?.params || {}) as Record<string, unknown>;
    const token = (data.access_token || data.token || json?.access_token) as string | undefined;
    return { token };
  } catch {
    return {};
  }
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
        source: "PULL_FROM_URL",
        video_url: absoluteVideoUrl,
      },
    };

    if (apiKey && accountId && !customAccessToken) {
      for (const endpoint of [
        "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
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
          const publishId = inner?.data?.publish_id;

          if (proxyRes.ok && publishId) {
            return reply({
              success: true,
              publishId,
              message: "Vídeo enviado com sucesso para o TikTok via Composio!",
            });
          }

          if (inner?.error?.message && !/scope/i.test(inner.error.message)) {
            return reply({ error: inner.error.message, details: inner.error }, 400);
          }
        } catch {}
      }
    }

    if (!customAccessToken) {
      return reply({
        error: "Falha ao enviar para o TikTok via Composio. Verifique se o perfil foi autorizado na conexão.",
      }, 400);
    }

    const response = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customAccessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || (data?.error && data.error.code !== "ok")) {
      const msg = data?.error?.message || "Falha ao enviar publicação para o TikTok.";
      return reply({ error: msg, details: data?.error }, 400);
    }

    const publishId = data?.data?.publish_id;

    return reply({
      success: true,
      publishId,
      message: "Vídeo enviado com sucesso para a fila de publicação do TikTok!",
    });
  } catch (error) {
    return reply({
      error: error instanceof Error ? error.message : "Erro inesperado ao postar no TikTok.",
    }, 500);
  }
}
