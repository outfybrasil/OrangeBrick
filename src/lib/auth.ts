import type { User } from "@supabase/supabase-js";

export function isAdminUser(user: User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

export function isVerifiedAdminSession(user: User | null, accessToken: string): user is User {
  if (!isAdminUser(user)) return false;
  try {
    const encoded = accessToken.split(".")[1];
    if (!encoded) return false;
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown; aal?: unknown };
    return payload.sub === user?.id && payload.aal === "aal2";
  } catch {
    return false;
  }
}
