import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { PostArticle } from "./PostDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Criamos um cliente básico estático para consultas sem cookies em tempo de build/SSR
function getStaticSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function generateStaticParams() {
  const supabase = getStaticSupabaseClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("slug")
    .eq("is_published", true);

  if (!posts) return [];

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getStaticSupabaseClient();
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
