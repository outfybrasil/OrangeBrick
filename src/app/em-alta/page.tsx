import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Post, Reaction } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const supabase = createServiceRoleClient();
  const [{ data: postData }, { data: reactionData }, { data: viewData }] = await Promise.all([
    supabase.from("posts").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(40),
    supabase.from("reactions").select("post_id, reaction_type"),
    supabase.from("post_views").select("post_id"),
  ]);
  const scores: Record<string, number> = {};
  for (const reaction of (reactionData || []) as Pick<Reaction, "post_id" | "reaction_type">[]) scores[reaction.post_id] = (scores[reaction.post_id] || 0) + (reaction.reaction_type === "hype" ? 4 : 2);
  for (const view of (viewData || []) as Array<{ post_id: string }>) scores[view.post_id] = (scores[view.post_id] || 0) + 1;
  const posts = ((postData || []) as Post[]).sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));

  return <div className="min-h-dvh bg-background-void text-white">
    <header className="border-b border-white/10"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Link href="/" className="font-heading text-lg font-black uppercase">Orange<span className="text-brand-orange">_</span>Brick</Link><Link href="/brickboard" className="text-xs font-bold text-gray-300 hover:text-white">Brickboard</Link></div></header>
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Termômetro das matérias recentes</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-6xl">Em alta agora</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">Ranking calculado por leitura e reação. Não é uma seleção patrocinada.</p>
      <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {posts.map((post, index) => <Link key={post.id} href={`/posts/${post.slug}`} className="group grid gap-4 py-5 sm:grid-cols-[3rem_10rem_1fr] sm:items-center">
          <span className="font-heading text-3xl font-black text-brand-orange">{String(index + 1).padStart(2, "0")}</span>
          {post.image_url ? <img src={post.image_url} alt={post.image_alt || post.title} className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-card-slate" />}
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{scores[post.id] || 0} pontos de interesse</p><h2 className="mt-1 font-heading text-lg font-black uppercase group-hover:text-brand-orange">{post.title}</h2><p className="mt-2 line-clamp-2 text-sm text-gray-400">{post.summary}</p></div>
        </Link>)}
      </div>
    </main><Footer />
  </div>;
}
