import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { PostArticle } from "./PostDetailClient";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Post, PostStats, PostCategory, ReactionType } from "@/lib/types/database";
import { getSiteUrl } from "@/lib/site-url";
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
      .eq("slug", slug)
      .maybeSingle();
    return data as Post | null;
  }
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
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

const getStatsCached = unstable_cache(getStatsUncached, ["post-stats"], { revalidate: 60 });

function getStats(postId: string): Promise<PostStats> {
  return getStatsCached(postId);
}

async function getRelatedPosts(postId: string, category: PostCategory): Promise<Pick<Post, "id" | "slug" | "title" | "summary" | "image_url" | "category" | "published_at">[]> {
  const serviceClient = createServiceRoleClient();
  const { data } = await serviceClient
    .from("posts")
    .select("id,slug,title,summary,image_url,category,published_at")
    .eq("is_published", true)
    .eq("category", category)
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(4);
  return (data || []) as Pick<Post, "id" | "slug" | "title" | "summary" | "image_url" | "category" | "published_at">[];
}

export async function generateMetadata({ params, searchParams }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = typeof sParams.preview === "string" && verifyPreviewToken(slug, sParams.preview);
  const post = await getPost(slug, isPreview);
  if (!post) return { title: "Matéria não encontrada" };
  const canonical = `/posts/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical },
    robots: isPreview ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: canonical,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = typeof sParams.preview === "string" && verifyPreviewToken(slug, sParams.preview);
  const post = await getPost(slug, isPreview);
  if (!post) notFound();
  const [stats, relatedPosts] = await Promise.all([
    getStats(post.id),
    getRelatedPosts(post.id, post.category),
  ]);
  const siteUrl = getSiteUrl();
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.summary,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    inLanguage: "pt-BR",
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
    mainEntityOfPage: `${siteUrl}/posts/${post.slug}`,
    isAccessibleForFree: true,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Notícias",
        item: `${siteUrl}/noticias`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${siteUrl}/posts/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(newsArticleJsonLd).replace(/</g, "\\u003c")}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c")}</script>
      {!post.is_published && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 py-2.5 px-4 text-center text-xs font-mono font-semibold tracking-wider sticky top-0 z-50 backdrop-blur-md">
          MODO DE PRÉ-VISUALIZAÇÃO — Este rascunho ainda não foi publicado no portal
        </div>
      )}
      <PostArticle post={post} stats={stats} relatedPosts={relatedPosts} />
    </>
  );
}
