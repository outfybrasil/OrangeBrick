import { Suspense } from "react";
import { HomePageClient } from "@/components/feed/HomePageClient";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";
import { getSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "OrangeBrick — Notícias de Games, Lançamentos e BrickBoard",
  description: "Portal gamer definitivo: últimas notícias, radar de lançamentos oficiais, termômetro da comunidade e o feed BrickBoard.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "OrangeBrick — Notícias de Games, Lançamentos e BrickBoard",
    description: "Portal gamer definitivo: notícias de games, radar de lançamentos oficiais, termômetro da comunidade e debates no BrickBoard.",
    url: "/",
    siteName: "Orange Brick",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OrangeBrick — Notícias de Games, Lançamentos e BrickBoard",
    description: "Portal gamer definitivo: últimas notícias, lançamentos e o BrickBoard.",
  },
};

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
  const siteUrl = getSiteUrl();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Orange Brick",
    alternateName: "OrangeBrick",
    url: siteUrl,
    description: "Portal de notícias de games, radar de lançamentos e comunidade gamer BrickBoard.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
      />
      <h1 className="sr-only">
        OrangeBrick — Notícias de Games, Últimas notícias, Lançamentos e BrickBoard
      </h1>
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
