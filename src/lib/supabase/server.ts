import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import type { FlexibleDatabase } from "@/lib/supabase/client";
import { createSupabaseCookieAdapter } from "@/lib/server/supabase-cookies";

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function createServiceDataClient() {
  return createClient<FlexibleDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function createPublicServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createSsrServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: createSupabaseCookieAdapter(cookieStore),
    }
  );
}

export async function createServerDataClient() {
  const cookieStore = await cookies();
  return createSsrServerClient<FlexibleDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: createSupabaseCookieAdapter(cookieStore),
    }
  );
}
