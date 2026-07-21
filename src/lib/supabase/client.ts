import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type FlexibleTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

interface FlexibleDatabase {
  public: {
    Tables: Record<string, FlexibleTable>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export function createDataClient() {
  return createBrowserClient<FlexibleDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
