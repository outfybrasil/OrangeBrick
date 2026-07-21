import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function hashIdentity(value: string) {
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
