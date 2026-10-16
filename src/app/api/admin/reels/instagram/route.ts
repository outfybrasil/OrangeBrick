import { NextResponse } from "next/server";
import { isVerifiedAdminSession } from "@/lib/auth";
import { getReelAdmin } from "@/lib/video/reel-remote";
import { getSiteUrl } from "@/lib/site-url";

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

async function resolveInstagramComposio(): Promise<{ token?: string; accountId?: string }> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  const accountId = process.env.COMPOSIO_INSTAGRAM_ACCOUNT;
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
    let igId = (data.instagram_account_id || data.account_id || data.page_id || json?.user_id) as string | undefined;

    if (token && !igId) {
      try {
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username},name&access_token=${encodeURIComponent(token)}`, {
          signal: AbortSignal.timeout(6_000),
        });
        if (meRes.ok) {
          const meJson = await meRes.json();
          const list = Array.isArray(meJson?.data) ? meJson.data : [];
          for (const item of list) {
            if (item?.instagram_business_account?.id) {
              igId = String(item.instagram_business_account.id);
              break;
            }
          }
        }
      } catch {}
    }

    return { token, accountId: igId };
  } catch {
    return {};
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
      accountId: process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID || (composioConfigured ? "Composio Connected" : ""),
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Erro ao consultar status do Instagram." }, 500);
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

    const caption = typeof body.caption === "string" ? body.caption.trim() : "";
    const composioCreds = await resolveInstagramComposio();
    const accessToken = body.accessToken?.trim() || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || composioCreds.token;
    const accountId = body.accountId?.trim() || process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID || composioCreds.accountId;

    if (!accessToken || !accountId) {
      return reply({
        error: "Credenciais do Instagram não configuradas. Preencha o Token de Acesso e o ID da Conta ou vincule sua conta no Composio (COMPOSIO_INSTAGRAM_ACCOUNT).",
      }, 400);
    }

    let absoluteVideoUrl = body.videoUrl.trim();
    if (absoluteVideoUrl.startsWith("/")) {
      const siteUrl = getSiteUrl();
      absoluteVideoUrl = `${siteUrl}${absoluteVideoUrl}`;
    }

    const createContainerUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/media`);
    createContainerUrl.searchParams.set("media_type", "REELS");
    createContainerUrl.searchParams.set("video_url", absoluteVideoUrl);
    createContainerUrl.searchParams.set("caption", caption);
    createContainerUrl.searchParams.set("access_token", accessToken);

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
    const maxPollAttempts = 24;
    let isFinished = false;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const statusUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(containerId)}`);
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", accessToken);

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

    const publishUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/media_publish`);
    publishUrl.searchParams.set("creation_id", containerId);
    publishUrl.searchParams.set("access_token", accessToken);

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
