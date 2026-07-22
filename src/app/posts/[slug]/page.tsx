import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "./PostDetailClient";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Post, PostStats, ReactionType } from "@/lib/types/database";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data as Post | null;
}

async function getStats(postId: string): Promise<PostStats> {
  const supabase = createServiceRoleClient();
  const [reactions, views, comments] = await Promise.all([
    supabase.from("reactions").select("reaction_type").eq("post_id", postId).returns<{ reaction_type: ReactionType }[]>(),
    supabase.from("post_views").select("id", { count: "exact", head: true }).eq("post_id", postId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId),
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

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
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

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const stats = await getStats(post.id);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.summary,
    image: post.image_url ? [post.image_url] : [],
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author_name },
    publisher: { "@type": "Organization", name: "Orange Brick" },
    mainEntityOfPage: `/posts/${post.slug}`,
  };
  return (
    <>
      <script type="application/ld+json">{JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>
      <PostArticle post={post} stats={stats} />
    </>
  );
}
