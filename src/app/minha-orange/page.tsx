"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";
import { useFollowPreferences } from "@/lib/hooks/useFollowPreferences";
import type { Post } from "@/lib/types/database";

const platforms = ["PlayStation", "Xbox", "Nintendo", "PC", "Mobile"];

export default function MyOrangePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const { follows, isLoading, toggleFollow } = useFollowPreferences();
  const [posts, setPosts] = useState<Post[]>([]);
  const [continued] = useState<Array<{ slug: string; title: string; progress: number }>>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("orange-reading-progress") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    supabase.from("posts").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(30).then(({ data }) => setPosts((data || []) as Post[]));
  }, [supabase]);

  const personalized = posts.filter((post) => !follows.topic.length || (post.topic_id && follows.topic.includes(post.topic_id))).slice(0, 8);

  return <div className="min-h-dvh bg-background-void text-white">
    <header className="border-b border-white/10"><div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><Link href="/" className="font-heading text-lg font-black uppercase">Orange<span className="text-brand-orange">_</span>Brick</Link><Link href="/em-alta" className="text-xs font-bold text-gray-300 hover:text-white">Em alta</Link></div></header>
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Seu resumo pessoal</p><h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-6xl">Minha Orange</h1>
      <p className="mt-3 max-w-xl text-sm text-gray-300">Notícias, assuntos e conversas organizados pelas escolhas que você fez.</p>
      {!user && <div className="mt-8 border border-brand-orange/30 bg-brand-orange/[0.06] p-5 text-sm text-gray-200">Entre na sua conta para sincronizar assuntos e plataformas em todos os dispositivos.</div>}
      <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Preferências</p><h2 className="mt-1 font-heading text-2xl font-black uppercase">Suas plataformas</h2></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{platforms.map((platform) => <button disabled={!user || isLoading} type="button" key={platform} onClick={() => void toggleFollow("platform", platform)} className={`min-h-11 border px-4 text-xs font-bold ${follows.platform.includes(platform) ? "border-brand-orange bg-brand-orange text-white" : "border-white/15 text-gray-300 hover:border-brand-orange/50"}`}>{platform}</button>)}</div>
      </section>
      {continued.length > 0 && <section className="mt-12"><h2 className="font-heading text-2xl font-black uppercase">Continue lendo</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{continued.slice(0, 4).map((item) => <Link key={item.slug} href={`/posts/${item.slug}`} className="border border-white/10 p-4 hover:border-brand-orange/40"><p className="font-bold text-white">{item.title}</p><div className="mt-3 h-1 bg-white/10"><div className="h-full bg-brand-orange" style={{ width: `${item.progress}%` }} /></div><p className="mt-2 text-[10px] text-gray-500">{item.progress}% lido</p></Link>)}</div></section>}
      <section className="mt-12"><div className="flex items-end justify-between gap-4"><h2 className="font-heading text-2xl font-black uppercase">Seu giro de notícias</h2><Link href="/assuntos" className="text-xs font-bold text-brand-orange">Escolher assuntos</Link></div><div className="mt-4 divide-y divide-white/10 border-y border-white/10">{personalized.map((post) => <Link href={`/posts/${post.slug}`} key={post.id} className="block py-5"><p className="text-[10px] font-bold uppercase text-brand-orange">{post.category}</p><h3 className="mt-1 font-heading text-lg font-black uppercase hover:text-brand-orange">{post.title}</h3><p className="mt-2 line-clamp-2 text-sm text-gray-400">{post.summary}</p></Link>)}</div></section>
    </main><Footer />
  </div>;
}
