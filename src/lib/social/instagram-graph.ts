export type InstagramAccount = { id: string; username: string };
type GraphData = { id?: string; username?: string; status_code?: string; status?: string; permalink?: string; error?: { message?: string; code?: number } };

export function instagramConfigured() {
  return Boolean((process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN) && (process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID) || process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_INSTAGRAM_ACCOUNT);
}

export function instagramGraph(fetcher: typeof fetch = fetch) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID || process.env.META_INSTAGRAM_ACCOUNT_ID;
  const apiKey = process.env.COMPOSIO_API_KEY;
  const connectedAccount = process.env.COMPOSIO_INSTAGRAM_ACCOUNT;
  const userId = process.env.COMPOSIO_USER_ID || "pg-test-107e6949-7abc-4a6e-a8c9-dbe29178282d";
  const proxy = !accessToken;
  const version = /^v\d+\.\d+$/.test(process.env.INSTAGRAM_GRAPH_VERSION || "") ? process.env.INSTAGRAM_GRAPH_VERSION! : "v21.0";
  const host = proxy ? "https://graph.instagram.com" : "https://graph.facebook.com";

  async function call(endpoint: string, method: "GET" | "POST" = "GET", body?: Record<string, string>): Promise<GraphData> {
    if (proxy ? !apiKey || !connectedAccount : !accessToken || !accountId) throw new Error("A conexão do Instagram não está configurada no servidor.");
    const url = `${host}/${version}/${endpoint}`;
    const response = proxy
      ? await fetcher("https://backend.composio.dev/api/v3.1/tools/execute/proxy", {
        method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey! },
        body: JSON.stringify({ connected_account_id: connectedAccount, user_id: userId, endpoint: url, method, ...(body ? { headers: { "Content-Type": "application/json" }, body } : {}) }),
        signal: AbortSignal.timeout(25_000),
      })
      : await fetcher(url, { method, headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) }, ...(body ? { body: new URLSearchParams(body) } : {}), signal: AbortSignal.timeout(25_000) });
    const json = await response.json().catch(() => null);
    const data: GraphData | null = proxy ? json?.data : json;
    if (!response.ok || !data || data.error || json?.successful === false || json?.error) {
      let message = data?.error?.message || json?.error?.message || "O Instagram recusou a solicitação. Confira a conexão e as permissões da conta.";
      for (const secret of [accessToken, apiKey]) if (secret) message = message.split(secret).join("[oculto]");
      throw new Error(String(message).slice(0, 500));
    }
    return data;
  }

  async function account(): Promise<InstagramAccount> {
    const data = await call(`${encodeURIComponent(proxy ? "me" : accountId!)}?fields=id,username`);
    if (!data.id || !/^\d+$/.test(String(data.id)) || !data.username) throw new Error("Não foi possível confirmar a conta de destino. Revise a conexão do Instagram.");
    return { id: String(data.id), username: data.username };
  }
  return { call, account };
}

export async function publishInstagramImages(options: {
  account: InstagramAccount;
  caption: string;
  images: Array<{ url: string; alt: string }>;
  call: ReturnType<typeof instagramGraph>["call"];
  beforePublish: (containerId: string) => Promise<void>;
  pause?: () => Promise<void>;
}) {
  const { account, images, call } = options;
  if (images.length < 1 || images.length > 10) throw new Error("O envio direto aceita entre 1 e 10 imagens.");
  const pause = options.pause || (() => new Promise<void>(resolve => setTimeout(resolve, 2000)));
  const deadline = Date.now() + 180_000;
  const ready = async (id: string) => {
    for (let attempt = 0; attempt < 15 && Date.now() < deadline; attempt++) {
      const result = await call(`${encodeURIComponent(id)}?fields=status_code,status`);
      if (result.status_code === "FINISHED") return;
      if (result.status_code === "ERROR" || result.status_code === "EXPIRED") throw new Error("O Instagram não conseguiu processar uma imagem. Confira os arquivos e tente novamente.");
      if (result.status_code === "PUBLISHED") throw new Error("Este conteúdo já foi publicado. Atualize o histórico antes de continuar.");
      await pause();
    }
    throw new Error("O Instagram ainda não concluiu o processamento. Nenhuma publicação foi solicitada; tente novamente mais tarde.");
  };
  const children: string[] = [];
  for (const image of images) {
    if (Date.now() > deadline) throw new Error("O preparo do Instagram excedeu o tempo limite. Nenhuma publicação foi solicitada.");
    const result = await call(`${account.id}/media`, "POST", { image_url: image.url, alt_text: image.alt.slice(0, 1000), ...(images.length > 1 ? { is_carousel_item: "true" } : { caption: options.caption }) });
    if (!result.id) throw new Error("O Instagram não retornou o identificador da imagem.");
    children.push(String(result.id));
  }
  for (const id of children) await ready(id);
  let containerId = children[0];
  if (children.length > 1) {
    const parent = await call(`${account.id}/media`, "POST", { media_type: "CAROUSEL", children: children.join(","), caption: options.caption });
    if (!parent.id) throw new Error("O Instagram não retornou o identificador do carrossel.");
    containerId = String(parent.id);
    await ready(containerId);
  }
  await options.beforePublish(containerId);
  const published = await call(`${account.id}/media_publish`, "POST", { creation_id: containerId });
  if (!published.id) throw new Error("O Instagram não confirmou o resultado. Confira a conta antes de tentar novamente.");
  return { mediaId: String(published.id), containerId };
}
