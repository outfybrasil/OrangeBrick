import { Suspense } from "react";
import { HomePageClient } from "@/components/feed/HomePageClient";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

export const revalidate = 60;

const PAGE_SIZE = 50;

async function fetchLatestPosts() {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_LIST_COLUMNS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  return (data as unknown as Post[] | null) || [];
}

export default async function HomePage() {
  const initialPosts = await fetchLatestPosts();

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      }>
        <HomePageClient initialPosts={initialPosts} />
      </Suspense>
    </div>
  );
}