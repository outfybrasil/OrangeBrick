import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedCorsOrigins = new Set([
  "https://orangebrick.blog",
  "https://www.orangebrick.blog",
  "https://orange-brick.vercel.app",
]);
function getConfiguredSiteOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}
const configuredSiteOrigin = getConfiguredSiteOrigin(Deno.env.get("SITE_URL"));
if (configuredSiteOrigin) allowedCorsOrigins.add(configuredSiteOrigin);

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(request: Request) {
  return request.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}

export function serve(handler: (request: Request) => Response | Promise<Response>) {
  Deno.serve(async (request) => {
    const response = await handler(request);
    const headers = new Headers(response.headers);
    const origin = request.headers.get("origin");
    if (origin && allowedCorsOrigins.has(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
    }
    const vary = headers.get("Vary");
    headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}

function serviceApiKey() {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysJson) {
    try {
      const secretKeys: unknown = JSON.parse(secretKeysJson);
      if (typeof secretKeys === "object" && secretKeys !== null && "default" in secretKeys) {
        const defaultKey = secretKeys.default;
        if (typeof defaultKey === "string" && defaultKey.length > 0) return defaultKey;
      }
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS contém JSON inválido.");
    }
  }
  const key = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Configure uma chave secreta do Supabase para as Edge Functions.");
  return key;
}

export async function isServiceApiKey(value: string) {
  const expectedKeys = new Set<string>();
  try {
    expectedKeys.add(serviceApiKey());
  } catch {
    if (!Deno.env.get("SUPABASE_SECRET_KEY") && !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return false;
  }
  for (const key of [Deno.env.get("SUPABASE_SECRET_KEY"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")]) {
    if (key) expectedKeys.add(key);
  }
  if (expectedKeys.size === 0) return false;
  const encoder = new TextEncoder();
  const candidateHash = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  const candidateBytes = new Uint8Array(candidateHash);
  let matches = false;
  for (const key of expectedKeys) {
    const expectedHash = await crypto.subtle.digest("SHA-256", encoder.encode(key));
    const expectedBytes = new Uint8Array(expectedHash);
    let difference = 0;
    for (let index = 0; index < expectedBytes.length; index++) {
      difference |= expectedBytes[index] ^ candidateBytes[index];
    }
    if (difference === 0) matches = true;
  }
  return matches;
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceApiKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function hashIdentity(value: string) {
  const salt = Deno.env.get("RATE_LIMIT_SALT") || serviceApiKey();
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function allowRequest(request: Request, action: string, limit: number, windowSeconds: number) {
  const identityHash = await hashIdentity(requestIp(request));
  const now = Math.floor(Date.now() / 1000);
  const windowStart = new Date((now - (now % windowSeconds)) * 1000).toISOString();
  const { data, error } = await serviceClient().rpc("consume_rate_limit", {
    p_action: action,
    p_identity_hash: identityHash,
    p_window_start: windowStart,
    p_limit: limit,
  });
  if (error) throw error;
  return { allowed: data === true, identityHash };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isAllowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const configured = (Deno.env.get("PUSH_ENDPOINT_HOSTS") || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    const allowed = [
      "fcm.googleapis.com",
      "updates.push.services.mozilla.com",
      "notify.windows.com",
      "web.push.apple.com",
      ...configured,
    ];
    const hostname = url.hostname.toLowerCase();
    return allowed.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
