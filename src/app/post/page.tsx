import { notFound, redirect } from "next/navigation";

interface LegacyPostPageProps {
  searchParams: Promise<{ slug?: string }>;
}

export default async function LegacyPostPage({ searchParams }: LegacyPostPageProps) {
  const { slug } = await searchParams;
  if (!slug) notFound();
  redirect(`/posts/${encodeURIComponent(slug)}`);
}
