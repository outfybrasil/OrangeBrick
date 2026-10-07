import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

type FlexibleTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface FlexibleDatabase {
  public: {
    Tables: Record<string, FlexibleTable>;
    Views: Record<string, never>;
    Functions: Record<string, {
      Args: Record<string, unknown>;
      Returns: unknown;
    }> & {
      get_community_comment_like_summaries: {
        Args: { target_comment_ids: string[] };
        Returns: { comment_id: string; likes_count: number; user_has_liked: boolean }[];
      };
      article_comment_like_summaries: {
        Args: { target_comment_ids: string[] };
        Returns: { comment_id: string; likes_count: number; user_has_liked: boolean }[];
      };
      set_article_comment_like: {
        Args: { target_comment_id: string; should_like: boolean };
        Returns: undefined;
      };
    };
  };
}

export function createDataClient() {
  return createBrowserClient<FlexibleDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}
