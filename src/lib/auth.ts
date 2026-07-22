import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "orangebrick0@gmail.com";

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  const emailOk = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const metadataOk = user.app_metadata?.is_admin === true;
  return emailOk && metadataOk;
}

export function requireAdminEnv() {
  return { adminEmail: ADMIN_EMAIL };
}
