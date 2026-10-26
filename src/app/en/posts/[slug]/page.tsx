import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { PostArticle } from "@/app/posts/[slug]/PostDetailClient";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { POST_DETAIL_PUBLIC_COLUMNS, type Post, type PostStats, type ReactionType } from "@/lib/types/database";
import { getSiteUrl } from "@/lib/site-url";
import { relatedArticles } from "@/lib/content-discovery";
import { verifyPreviewToken } from "@/lib/preview-token";

export const dynamic = "force-dynamic";

interface PostPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ preview?: string }>;
}

async function getPost(slug: string, isPreview = false): Promise<Post | null> {
  if (isPreview) {
    const serviceClient = createServiceRoleClient();
    const { data } = await serviceClient
      .from("posts")
      .select("*")
      .or(`slug_en.eq.${slug},slug.eq.${slug}`)
      .maybeSingle();
    return data as Post | null;
  }
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_DETAIL_PUBLIC_COLUMNS)
    .or(`slug_en.eq.${slug},slug.eq.${slug}`)
    .eq("is_published", true)
    .maybeSingle();
  return data as Post | null;
}

const getStatsUncached = async (postId: string): Promise<PostStats> => {
  const serviceClient = createServiceRoleClient();
  const [reactions, views, comments] = await Promise.all([
    serviceClient.from("reactions").select("reaction_type").eq("post_id", postId).returns<{ reaction_type: ReactionType }[]>(),
    serviceClient.from("post_views").select("id", { count: "exact", head: true }).eq("post_id", postId),
    serviceClient.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId),
  ]);
  const counts: Record<ReactionType, number> = { hype: 0, flop: 0, salty: 0 };
  for (const row of reactions.data || []) {
    if (row.reaction_type in counts) counts[row.reaction_type as ReactionType]++;
  }
  return {
    reactions: counts,
    views: views.count || 0,
    comments: comments.count || 0,
    userReaction: null,
  };
};

const getStatsCached = unstable_cache(getStatsUncached, ["post-stats-en"], { revalidate: 60 });

function getStats(postId: string): Promise<PostStats> {
  return getStatsCached(postId);
}

async function getRelatedPosts(post: Post) {
  const client = createPublicServerClient();
  type RelatedPost = Pick<Post, "id" | "slug" | "slug_en" | "title" | "title_en" | "summary" | "summary_en" | "image_url" | "category" | "published_at" | "topic_id">;
  const columns = "id,slug,slug_en,title,title_en,summary,summary_en,image_url,category,published_at,topic_id";
  const recentQuery = client.from("posts").select(columns).eq("is_published", true).neq("id", post.id).order("published_at", { ascending: false }).limit(80).abortSignal(AbortSignal.timeout(5000)).returns<RelatedPost[]>();
  const topicQuery = post.topic_id
    ? client.from("posts").select(columns).eq("is_published", true).eq("topic_id", post.topic_id).neq("id", post.id).order("published_at", { ascending: false }).limit(20).abortSignal(AbortSignal.timeout(5000)).returns<RelatedPost[]>()
    : Promise.resolve({ data: [] });
  const [recent, topic] = await Promise.all([recentQuery, topicQuery]);
  return relatedArticles(post, [...(topic.data || []), ...(recent.data || [])]);
}

export async function generateMetadata({ params, searchParams }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = typeof sParams.preview === "string" && verifyPreviewToken(slug, sParams.preview);
  const post = await getPost(slug, isPreview);
  if (!post) return { title: "Article not found" };
  const postTitle = post.title_en || post.title;
  const postSummary = post.summary_en || post.summary;
  const postSlug = post.slug_en || post.slug;
  const canonical = `/en/posts/${postSlug}`;
  return {
    title: postTitle,
    description: postSummary,
    alternates: {
      canonical,
      languages: {
        "pt-BR": `/posts/${post.slug}`,
        "en-US": `/en/posts/${postSlug}`,
      },
    },
    robots: isPreview ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: postTitle,
      description: postSummary,
      url: canonical,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: postTitle,
      description: postSummary,
    },
  };
}

export default async function EnglishPostPage({ params, searchParams }: PostPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = typeof sParams.preview === "string" && verifyPreviewToken(slug, sParams.preview);
  const post = await getPost(slug, isPreview);
  if (!post) notFound();
  const [stats, relatedPosts] = await Promise.all([
    getStats(post.id),
    getRelatedPosts(post),
  ]);
  const siteUrl = getSiteUrl();
  const postTitle = post.title_en || post.title;
  const postSummary = post.summary_en || post.summary;
  const postSlug = post.slug_en || post.slug;

  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: postTitle,
    description: postSummary,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: "en-US",
    articleSection: post.category,
    author: { "@type": "Person", name: post.author_name, url: `${siteUrl}/sobre` },
    publisher: {
      "@type": "Organization",
      name: "Orange Brick",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icons/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: `${siteUrl}/en/posts/${postSlug}`,
    isAccessibleForFree: true,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/en`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "News",
        item: `${siteUrl}/en/noticias`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: postTitle,
        item: `${siteUrl}/en/posts/${postSlug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(newsArticleJsonLd).replace(/</g, "\\u003c")}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c")}</script>
      {!post.is_published && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 py-2.5 px-4 text-center text-xs font-mono font-semibold tracking-wider sticky top-0 z-50 backdrop-blur-md">
          PREVIEW MODE — This draft has not been published yet
        </div>
      )}
      <PostArticle post={post} stats={stats} relatedPosts={relatedPosts} isEn={true} />
    </>
  );
}
