import { Suspense } from "react";
import { HomePageClient } from "@/components/feed/HomePageClient";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";
import { saoPauloNewsDate } from "@/lib/news-query";
import type { Metadata } from "next";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Orange Brick — Gaming News, Release Radar and Community",
  description: "Gaming news portal: fast, direct reporting, official release radar, and the gamer community.",
  alternates: {
    canonical: "/en",
    languages: {
      "pt-BR": "/",
      "en-US": "/en",
    },
  },
  openGraph: {
    title: "Orange Brick — Gaming News, Release Radar and Community",
    description: "Gaming news portal: fast, direct reporting, official release radar, and the gamer community.",
    url: "/en",
    siteName: "Orange Brick",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orange Brick — Gaming News, Release Radar and Community",
    description: "Gaming news portal: fast, direct reporting, release radar, and the gamer community.",
  },
};

const PAGE_SIZE = 50;

async function fetchLatestPosts() {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_LIST_COLUMNS)
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);
  return (data as unknown as Post[] | null) || [];
}

export default async function EnglishHomePage() {
  const initialPosts = await fetchLatestPosts();

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <h1 className="sr-only">
        Orange Brick — Gaming News, Latest Headlines, Release Radar and Community
      </h1>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
          </div>
        }
      >
        <HomePageClient initialPosts={initialPosts} featuredDay={saoPauloNewsDate(new Date())} />
      </Suspense>
    </div>
  );
}
