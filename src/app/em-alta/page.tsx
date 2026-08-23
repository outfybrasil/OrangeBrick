import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/ui/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Post, Reaction } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Matérias em Alta no Momento — Orange Brick",
  description: "As notícias e matérias de games mais lidas e debatidas pela comunidade no Orange Brick.",
  alternates: {
    canonical: "/em-alta",
  },
  openGraph: {
    title: "Matérias em Alta no Momento | Orange Brick",
    description: "As matérias mais lidas e comentadas pelos gamers no Orange Brick.",
    url: "/em-alta",
    type: "website",
  },
};

export default async function TrendingPage() {
  const supabase = createServiceRoleClient();
  const [{ data: postData }, { data: scoreData, error: scoreError }] = await Promise.all([
    supabase.from("posts").select(POST_LIST_COLUMNS).eq("is_published", true).order("published_at", { ascending: false }).limit(40),
    supabase.rpc("get_post_interest_scores"),
  ]);
  const scores: Record<string, number> = {};
  if (!scoreError && scoreData) {
    for (const row of scoreData as unknown as Array<{ post_id: string; interest_score: number | string }>) {
      scores[row.post_id] = Number(row.interest_score);
    }
  } else {
    const [{ data: reactionData }, { data: viewData }] = await Promise.all([
      supabase.from("reactions").select("post_id, reaction_type"),
      supabase.from("post_views").select("post_id"),
    ]);
    for (const reaction of (reactionData || []) as Pick<Reaction, "post_id" | "reaction_type">[]) scores[reaction.post_id] = (scores[reaction.post_id] || 0) + (reaction.reaction_type === "hype" ? 4 : 2);
    for (const view of (viewData || []) as Array<{ post_id: string }>) scores[view.post_id] = (scores[view.post_id] || 0) + 1;
  }
  const posts = ((postData || []) as unknown as Post[]).sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return <div className="min-h-dvh bg-background-void text-white">
    <SiteHeader variant="strip" />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Termômetro das matérias recentes</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-6xl">Em alta agora</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">Ranking calculado por leitura e reação. Não é uma seleção patrocinada.</p>
      <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {posts.map((post, index) => <Link key={post.id} href={`/posts/${post.slug}`} className="group grid gap-4 py-5 sm:grid-cols-[3rem_10rem_1fr] sm:items-center">
          <span className="font-heading text-3xl font-black text-brand-orange">{String(index + 1).padStart(2, "0")}</span>
          {post.image_url ? <div className="relative aspect-video w-full overflow-hidden bg-card-slate"><Image src={post.image_url} alt={post.image_alt || post.title} fill sizes="(max-width: 640px) 100vw, 10rem" className="object-cover" /></div> : <div className="aspect-video bg-card-slate" />}
          <div><p className="text-xs font-bold uppercase tracking-wide text-gray-500">{scores[post.id] || 0} pontos de interesse</p><h2 className="mt-1 font-heading text-lg font-black uppercase group-hover:text-brand-orange">{post.title}</h2><p className="mt-2 line-clamp-2 text-sm text-gray-400">{post.summary}</p></div>
        </Link>)}
      </div>
    </main><Footer />
  </div>;
}
