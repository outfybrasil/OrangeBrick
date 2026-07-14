import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PostArticle } from "./PostDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("posts")
    .select("title, summary, image_url, author_name")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  const post = data as any;

  if (!post) {
    return { title: "Post não encontrado — Orange Brick" };
  }

  return {
    title: `${post.title} — Orange Brick`,
    description: post.summary,
    authors: [{ name: post.author_name }],
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      images: post.image_url ? [{ url: post.image_url }] : [],
    },
  };
}

export default async function PostDetail({ params }: Props) {
  const { slug } = await params;
  return <PostArticle slug={slug} />;
}
