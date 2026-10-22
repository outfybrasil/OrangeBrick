import type { Json } from "../types/database";

type ObjectData = Record<string, unknown>;

function object(value: unknown): ObjectData {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as ObjectData : {};
}

function operationError(value: unknown) {
  const details = JSON.stringify(value);
  if (/APIKey_InsufficientPermissions/i.test(details)) {
    return new Error("A chave do Composio não tem as permissões necessárias. Confira as permissões de sessões e execução de ferramentas no Composio.");
  }
  if (/quotaExceeded|dailyLimitExceeded/i.test(details)) {
    return new Error("A cota diária da API do YouTube foi esgotada. Aguarde a renovação da cota ou configure um aplicativo Google próprio no Composio. Reconectar a conta não renova essa cota.");
  }
  if (/uploadLimitExceeded/i.test(details)) {
    return new Error("O canal atingiu o limite de envios do YouTube. Aguarde a liberação de novos envios no YouTube Studio.");
  }
  if (/insufficientPermissions|insufficient.*scope|invalid_grant|UNAUTHENTICATED/i.test(details)) {
    return new Error("A conexão não tem autorização suficiente. Reconecte o YouTube no Composio e conceda as permissões solicitadas.");
  }
  return new Error("O Composio não confirmou a operação. Confira a conexão do YouTube e tente novamente.");
}

async function platformRequest(path: string, body?: ObjectData, timeout = 30_000): Promise<ObjectData> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("A conexão com o YouTube ainda não foi configurada no servidor.");
  const response = await fetch(`https://backend.composio.dev/api/v3.1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
    cache: "no-store",
  });
  const result = object(await response.json());
  if (!response.ok || result.error) throw operationError(result);
  return result;
}

export async function callComposio(name: string, args: Record<string, Json | undefined>, timeout = 30_000): Promise<ObjectData> {
  const { session_id: session, ...argumentsData } = args;
  if (typeof session !== "string") throw new Error("A sessão do YouTube não foi iniciada.");
  const result = await platformRequest(`tool_router/session/${encodeURIComponent(session)}/execute_meta`, {
    slug: name, arguments: argumentsData,
  }, timeout);
  if (result.result_type !== "completed") throw operationError(result);
  return object(result.data);
}

function toolData(result: ObjectData) {
  const rows = Array.isArray(result.results) ? result.results : [];
  const response = object(object(rows[0]).response);
  if (response.successful !== true) throw operationError(response);
  return object(response.data);
}

type YouTubeConnection = { account: string; session: string; channel: { id: string; title: string; url: string } };
let cachedConnection: { value: YouTubeConnection; expiresAt: number } | undefined;
let pendingConnection: Promise<YouTubeConnection> | undefined;
let connectionFailure: { error: Error; expiresAt: number } | undefined;

export async function getYouTubeConnection(forceRefresh = false): Promise<YouTubeConnection> {
  if (connectionFailure && connectionFailure.expiresAt > Date.now()) throw connectionFailure.error;
  if (!forceRefresh && cachedConnection && cachedConnection.expiresAt > Date.now()) return cachedConnection.value;
  if (pendingConnection) return pendingConnection;
  pendingConnection = loadYouTubeConnection().then(value => {
    cachedConnection = { value, expiresAt: Date.now() + 5 * 60_000 };
    connectionFailure = undefined;
    return value;
  }).catch(error => {
    cachedConnection = undefined;
    connectionFailure = { error: error instanceof Error ? error : new Error("Falha ao conectar ao YouTube."), expiresAt: Date.now() + 60_000 };
    throw connectionFailure.error;
  }).finally(() => { pendingConnection = undefined; });
  return pendingConnection;
}

async function loadYouTubeConnection(): Promise<YouTubeConnection> {
  const account = process.env.COMPOSIO_YOUTUBE_ACCOUNT;
  const expectedChannel = process.env.COMPOSIO_YOUTUBE_CHANNEL;
  if (!account || !expectedChannel) throw new Error("O canal de destino ainda não foi configurado no servidor.");
  const authConfig = process.env.COMPOSIO_YOUTUBE_AUTH_CONFIG;
  if (!authConfig) throw new Error("O aplicativo Google ainda não foi configurado no servidor.");
  const connected = await platformRequest(`connected_accounts/${encodeURIComponent(account)}`);
  const config = object(connected.auth_config);
  if (connected.status !== "ACTIVE" || connected.is_disabled === true || object(connected.toolkit).slug !== "youtube" || config.id !== authConfig || config.is_composio_managed !== false || config.is_disabled === true || typeof connected.user_id !== "string") {
    throw new Error("Confira a conexão do YouTube com seu aplicativo Google no Composio.");
  }
  const created = await platformRequest("tool_router/session", {
    user_id: connected.user_id,
    toolkits: { enable: ["youtube"] },
    auth_configs: { youtube: authConfig },
    connected_accounts: { youtube: [account] },
    instant: false,
    tools: { youtube: { enable: ["YOUTUBE_GET_CHANNEL_STATISTICS", "YOUTUBE_MULTIPART_UPLOAD_VIDEO"] } },
    manage_connections: { enable: false },
  });
  const session = created.session_id;
  if (typeof session !== "string") throw new Error("Não foi possível iniciar a conexão com o YouTube.");
  const data = toolData(await callComposio("COMPOSIO_MULTI_EXECUTE_TOOL", {
    session_id: session,
    tools: [{ tool_slug: "YOUTUBE_GET_CHANNEL_STATISTICS", arguments: { mine: true, part: "snippet" } }],
    sync_response_to_workbench: false,
    current_step: "IDENTIFYING_CHANNEL",
  }));
  const channels = Array.isArray(data.channels) ? data.channels : Array.isArray(data.items) ? data.items : [];
  const channel = channels.map(object).find(item => item.id === expectedChannel);
  if (!channel) throw new Error("O canal conectado mudou. Confira o destino configurado antes de enviar.");
  return { account, session, channel: { id: expectedChannel, title: String(object(channel.snippet).title || "YouTube"), url: `https://www.youtube.com/channel/${expectedChannel}` } };
}

export async function stageYouTubeVideo(session: string, signedUrl: string, jobId: string) {
  const payload = Buffer.from(JSON.stringify({ url: signedUrl, path: `/tmp/ob-${jobId}-${crypto.randomUUID()}.mp4` })).toString("base64");
  const code = [
    "import base64, json, requests, os, contextlib, io",
    `p = json.loads(base64.b64decode('${payload}'))`,
    "try:",
    "    r = requests.get(p['url'], timeout=60, stream=True)",
    "    r.raise_for_status()",
    "    size = 0",
    "    with open(p['path'], 'wb') as f:",
    "        for chunk in r.iter_content(1048576):",
    "            size += len(chunk)",
    "            if size > 104857600: raise Exception('Arquivo muito grande')",
    "            f.write(chunk)",
    "    with contextlib.redirect_stdout(io.StringIO()):",
    "        result, error = upload_local_file(p['path'])",
    "    if error: raise Exception('Falha ao preparar arquivo')",
    "    print('OB_FILE:' + json.dumps({'s3key': result['s3key']}))",
    "finally:",
    "    if os.path.exists(p['path']): os.remove(p['path'])",
  ].join("\n");
  const staged = await callComposio("COMPOSIO_REMOTE_WORKBENCH", {
    session_id: session, code_to_execute: code, current_step: "PREPARING_VIDEO",
  }, 120_000);
  const line = String(staged.stdout || "").split("\n").find(line => line.startsWith("OB_FILE:"));
  if (!line || staged.error) throw new Error("Não foi possível preparar o vídeo para envio. Tente novamente.");
  const file = object(JSON.parse(line.slice(8)));
  if (typeof file.s3key !== "string") throw new Error("O arquivo preparado não foi confirmado.");
  return { name: `${jobId}.mp4`, mimetype: "video/mp4", s3key: file.s3key };
}

export async function uploadYouTubeVideo(connection: Awaited<ReturnType<typeof getYouTubeConnection>>, file: Awaited<ReturnType<typeof stageYouTubeVideo>>, title: string, description: string, visibility: string, tags: string[] = []) {
  const data = toolData(await callComposio("COMPOSIO_MULTI_EXECUTE_TOOL", {
    session_id: connection.session,
    tools: [{ tool_slug: "YOUTUBE_MULTIPART_UPLOAD_VIDEO", arguments: { title, description, tags: tags.filter(Boolean).slice(0, 15), categoryId: "20", privacyStatus: visibility, videoFile: file } }],
    sync_response_to_workbench: false,
    current_step: "UPLOADING_VIDEO",
  }, 100_000));
  const video = object(data.video);
  if (typeof video.id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(video.id)) throw new Error("O envio não retornou o identificador do vídeo. Confira o YouTube Studio.");
  return video.id;
}
