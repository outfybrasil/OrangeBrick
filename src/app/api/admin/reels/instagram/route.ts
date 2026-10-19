import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getReelAdmin } from "@/lib/video/reel-remote";
import { getSiteUrl } from "@/lib/site-url";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { hasSocialDelivery, recordManualSocialDelivery } from "@/lib/video/reel-social-delivery";

export const runtime = "nodejs";
export const maxDuration = 300;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function authorized(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user }, error } = await getReelAdmin().auth.getUser(token);
  return !error && isVerifiedAdminSession(user, token);
}

async function getInstagramIdViaProxy(apiKey: string, accountId: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        connected_account_id: accountId,
        user_id: userId,
        endpoint: "https://graph.instagram.com/me?fields=id,username",
        method: "GET",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json().catch(() => null);
    return json?.data?.id ? String(json.data.id) : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    if (!await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }
    const composioConfigured = Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_INSTAGRAM_ACCOUNT);
    const hasEnvToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || composioConfigured);
    const hasEnvAccountId = Boolean(process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID || composioConfigured);
    return reply({
      configured: (hasEnvToken && hasEnvAccountId) || composioConfigured,
      hasEnvToken,
      hasEnvAccountId,
      composioConfigured,
      accountId: process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID || (composioConfigured ? "Composio Connected (OB Labs)" : ""),
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Erro ao consultar status do Instagram." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const automatic = isAuthorizedCronRequest(request);
    if (!automatic && !await authorized(request)) {
      return reply({ error: "Faça login como administrador para acessar." }, 403);
    }

    const body = await request.json().catch(() => null);
    if (!body || automatic && body.autoPublic !== true || typeof body.videoUrl !== "string" || !body.videoUrl.trim()) {
      return reply({ error: "URL do vídeo é obrigatória." }, 400);
    }

    if (!automatic && await hasSocialDelivery(body.postId, "instagram")) return reply({ error: "Este Reel ja tem um envio registrado no Instagram. Confira o acompanhamento antes de repetir." }, 409);
    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    const apiKey = process.env.COMPOSIO_API_KEY;
    const composioAccount = process.env.COMPOSIO_INSTAGRAM_ACCOUNT;
    const composioUserId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";
    const customAccessToken = body.accessToken?.trim() || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const customAccountId = body.accountId?.trim() || process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID;

    if (!customAccessToken && (!apiKey || !composioAccount)) {
      return reply({
        error: "Credenciais do Instagram não configuradas. Preencha o Token de Acesso e o ID da Conta ou vincule sua conta no Composio (COMPOSIO_INSTAGRAM_ACCOUNT).",
      }, 400);
    }

    let absoluteVideoUrl = body.videoUrl.trim();
    if (absoluteVideoUrl.startsWith("/")) {
      const siteUrl = getSiteUrl();
      absoluteVideoUrl = `${siteUrl}${absoluteVideoUrl}`;
    }

    if (apiKey && composioAccount && !customAccessToken) {
      const resolvedIgId = customAccountId || await getInstagramIdViaProxy(apiKey, composioAccount, composioUserId) || "28903874005934257";

      const createRes = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          connected_account_id: composioAccount,
          user_id: composioUserId,
          endpoint: `https://graph.instagram.com/v21.0/${encodeURIComponent(resolvedIgId)}/media`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            media_type: "REELS",
            video_url: absoluteVideoUrl,
            caption,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });

      const createJson = await createRes.json().catch(() => null);
      const containerId = createJson?.data?.id as string | undefined;

      if (!createRes.ok || !containerId) {
        const errorMsg = createJson?.error?.message || createJson?.data?.error?.message || "Falha ao criar o container de Reels no Instagram.";
        return reply({ error: errorMsg, details: createJson }, 400);
      }

      let isFinished = false;
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));

        const pollRes = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey },
          body: JSON.stringify({
            connected_account_id: composioAccount,
            user_id: composioUserId,
            endpoint: `https://graph.instagram.com/v21.0/${encodeURIComponent(containerId)}?fields=status_code,status`,
            method: "GET",
          }),
          signal: AbortSignal.timeout(15_000),
        });

        const pollJson = await pollRes.json().catch(() => null);
        const code = pollJson?.data?.status_code;

        if (code === "FINISHED") {
          isFinished = true;
          break;
        }

        if (code === "ERROR") {
          return reply({
            error: "O Instagram reportou erro no processamento do vídeo.",
            details: pollJson,
          }, 400);
        }
      }

      if (!isFinished) {
        return reply({
          error: "Tempo limite aguardando processamento do Instagram. O vídeo ainda pode estar sendo processado no Meta.",
          containerId,
        }, 504);
      }

      const publishRes = await fetch("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          connected_account_id: composioAccount,
          user_id: composioUserId,
          endpoint: `https://graph.instagram.com/v21.0/${encodeURIComponent(resolvedIgId)}/media_publish`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            creation_id: containerId,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      const publishJson = await publishRes.json().catch(() => null);
      const mediaId = publishJson?.data?.id as string | undefined;

      if (!publishRes.ok || !mediaId) {
        const errorMsg = publishJson?.error?.message || publishJson?.data?.error?.message || "Falha ao publicar o Reels no Instagram.";
        return reply({ error: errorMsg, details: publishJson }, 400);
      }

      if (!automatic) await recordManualSocialDelivery(body.postId, "instagram", "published", mediaId).catch(() => false);
      return reply({
        success: true,
        mediaId,
        containerId,
        message: "Reels publicado no Instagram com sucesso!",
      });
    }

    const createContainerUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(customAccountId!)}/media`);
    createContainerUrl.searchParams.set("media_type", "REELS");
    createContainerUrl.searchParams.set("video_url", absoluteVideoUrl);
    createContainerUrl.searchParams.set("caption", caption);
    createContainerUrl.searchParams.set("access_token", customAccessToken!);

    const containerResponse = await fetch(createContainerUrl.toString(), {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    const containerData = await containerResponse.json().catch(() => null);
    if (!containerResponse.ok || !containerData?.id) {
      const msg = containerData?.error?.message || "Falha ao criar o container de Reels no Instagram.";
      return reply({ error: msg, details: containerData?.error }, 400);
    }

    const containerId = containerData.id as string;
    let isFinished = false;

    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const statusUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(containerId)}`);
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", customAccessToken!);

      const statusResponse = await fetch(statusUrl.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      const statusData = await statusResponse.json().catch(() => null);
      const code = statusData?.status_code;

      if (code === "FINISHED") {
        isFinished = true;
        break;
      }

      if (code === "ERROR") {
        return reply({
          error: "O Instagram reportou erro no processamento do vídeo.",
          details: statusData,
        }, 400);
      }
    }

    if (!isFinished) {
      return reply({
        error: "Tempo limite aguardando processamento do Instagram. O vídeo ainda pode estar sendo processado no Meta.",
        containerId,
      }, 504);
    }

    const publishUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(customAccountId!)}/media_publish`);
    publishUrl.searchParams.set("creation_id", containerId);
    publishUrl.searchParams.set("access_token", customAccessToken!);

    const publishResponse = await fetch(publishUrl.toString(), {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    const publishData = await publishResponse.json().catch(() => null);
    if (!publishResponse.ok || !publishData?.id) {
      const msg = publishData?.error?.message || "Falha ao publicar o Reels no Instagram.";
      return reply({ error: msg, details: publishData?.error }, 400);
    }

    if (!automatic) await recordManualSocialDelivery(body.postId, "instagram", "published", publishData.id).catch(() => false);
    return reply({
      success: true,
      mediaId: publishData.id,
      containerId,
      message: "Reels publicado no Instagram com sucesso!",
    });
  } catch (error) {
    return reply({
      error: error instanceof Error ? error.message : "Erro inesperado ao postar no Instagram.",
    }, 500);
  }
}
