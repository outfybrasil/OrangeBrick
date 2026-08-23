"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { NewsFeed } from "@/components/feed/NewsFeed";
import { ReleaseRadarStrip } from "@/components/feed/ReleaseRadarStrip";
import { SinceLastVisit } from "@/components/feed/SinceLastVisit";
import { CommunityPulse } from "@/components/feed/CommunityPulse";
import { HomeEngagementTracker } from "@/components/feed/HomeEngagementTracker";
import { MultimediaSection } from "@/components/feed/MultimediaSection";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/ui/Footer";
import type { Post, PostCategory } from "@/lib/types/database";

interface HomePageClientProps {
  initialPosts: Post[];
}

export function HomePageClient({ initialPosts }: HomePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") as PostCategory | null;
  const qParam = searchParams.get("q") || "";
  const tagParam = searchParams.get("tag") || null;

  const activeTag = tagParam;

  const validCategories: PostCategory[] = ["breaking", "review", "hardware", "opinion", "industry", "modding"];
  const activeCategory = categoryParam && validCategories.includes(categoryParam) ? categoryParam : null;
  const hasQueryFilters = Boolean(activeCategory || qParam || activeTag);

  const handleCategoryClick = (catValue: PostCategory | null) => {
    const params = new URLSearchParams();
    if (catValue) params.set("category", catValue);
    if (qParam) params.set("q", qParam);
    if (activeTag) params.set("tag", activeTag);
    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  };

  return (
    <>
      <SiteHeader variant="full" searchQuery={qParam} />

      <main id="conteudo-principal" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <HomeEngagementTracker />
        <SinceLastVisit />

        <ReleaseRadarStrip />

        <NewsFeed
          category={activeCategory}
          activeTag={activeTag}
          searchQuery={qParam}
          onSelectCategory={handleCategoryClick}
          initialPosts={hasQueryFilters ? undefined : initialPosts}
        />

        <CommunityPulse />

        <MultimediaSection />
      </main>

      <Footer />
    </>
  );
}