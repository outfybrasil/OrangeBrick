import { Suspense } from "react";
import { HomePageClient } from "@/components/feed/HomePageClient";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";
import { getSiteUrl } from "@/lib/site-url";
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
    images: [{ url: "/icons/icon-512.png?v=3", width: 512, height: 512, alt: "Orange Brick logo" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/icons/icon-512.png?v=3"],
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
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Orange Brick",
        alternateName: ["OrangeBrick"],
        url: `${siteUrl}/en`,
        description: "Gaming news portal: fast, direct reporting, official release radar, and the gamer community.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/busca?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "NewsMediaOrganization",
        name: "Orange Brick",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icons/icon-512.png?v=3`,
          width: 512,
          height: 512,
        },
        image: `${siteUrl}/icons/icon-512.png?v=3`,
        sameAs: ["https://www.tiktok.com/@orangebrick.blog"],
      },
    ],
  };

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
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
