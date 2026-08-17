import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "./PostDetailClient";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Post, PostStats, ReactionType } from "@/lib/types/database";
import { getSiteUrl } from "@/lib/site-url";

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

async function getStats(postId: string): Promise<PostStats> {
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
}

export async function generateMetadata({ params, searchParams }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true" || sParams.preview === "1";
  const post = await getPost(slug, isPreview);
  if (!post) return { title: "Matéria não encontrada" };
  const canonical = `/posts/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      url: canonical,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at,
      images: post.image_url ? [{ url: post.image_url, alt: post.image_alt || post.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPreview = sParams.preview === "true" || sParams.preview === "1";
  const post = await getPost(slug, isPreview);
  if (!post) notFound();
  const stats = await getStats(post.id);
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
          ⚠️ MODO DE PRÉ-VISUALIZAÇÃO — Este rascunho ainda não foi publicado no portal
        </div>
      )}
      <PostArticle post={post} stats={stats} />
    </>
  );
}
