import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/ui/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { CommunityPostRow, Post, Profile, ReleaseRadarItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Busca — Orange Brick",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 80) || "";
  const supabase = createPublicServerClient();
  const pattern = `%${query.replace(/[%_]/g, "")}%`;
  const results = query.length >= 2 ? await Promise.all([
    supabase.from("posts").select("*").eq("is_published", true).or(`title.ilike.${pattern},summary.ilike.${pattern}`).limit(12),
    supabase.from("release_radar_items").select("*").eq("is_active", true).ilike("game", pattern).limit(10),
    supabase.from("profiles").select("*").or(`display_name.ilike.${pattern},username.ilike.${pattern}`).limit(8),
    supabase.from("community_posts").select("*").ilike("content", pattern).limit(12),
  ]) : [];
  const rank = (value: string) => value.toLocaleLowerCase("pt-BR") === query.toLocaleLowerCase("pt-BR") ? 0 : value.toLocaleLowerCase("pt-BR").startsWith(query.toLocaleLowerCase("pt-BR")) ? 1 : 2;
  const posts = ((results[0]?.data || []) as Post[]).sort((a, b) => rank(a.title) - rank(b.title));
  const releases = ((results[1]?.data || []) as ReleaseRadarItem[]).sort((a, b) => rank(a.game) - rank(b.game));
  const profiles = (results[2]?.data || []) as Profile[];
  const bricks = (results[3]?.data || []) as CommunityPostRow[];
  const total = posts.length + releases.length + profiles.length + bricks.length;

  return <div className="min-h-dvh bg-background-void text-white"><SiteHeader variant="strip" /><main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Busca universal</p><h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-6xl">Encontre tudo.</h1><form className="mt-8 flex max-w-3xl gap-2"><input name="q" defaultValue={query} minLength={2} required autoFocus placeholder="Matéria, jogo, leitor ou conversa" aria-label="Buscar matérias, jogos, leitores ou conversas" className="min-h-12 min-w-0 flex-1 border border-white/15 bg-card-slate/40 px-4 text-sm outline-none focus:border-brand-orange/60" /><button className="min-h-12 bg-brand-orange px-6 text-xs font-black uppercase">Buscar</button></form>{query && <p className="mt-4 text-sm text-gray-400">{total} resultados para “{query}”</p>}
  <div className="mt-10 grid gap-10 lg:grid-cols-2">
    <ResultSection title="Matérias">{posts.map((post) => <Link key={post.id} href={`/posts/${post.slug}`} className="block border-t border-white/10 py-4"><strong className="font-heading text-sm uppercase hover:text-brand-orange"><Highlight value={post.title} query={query} /></strong><p className="mt-1 line-clamp-2 text-xs text-gray-400"><Highlight value={post.summary} query={query} /></p></Link>)}</ResultSection>
    <ResultSection title="Lançamentos no Radar">{releases.map((release) => <Link key={release.id} href={`/lancamentos#${release.id}`} className="block border-t border-white/10 py-4 text-sm font-bold hover:text-brand-orange">{release.game} <span className="font-normal text-gray-500">· {release.release_label}</span></Link>)}</ResultSection>
    <ResultSection title="Leitores">{profiles.map((profile) => <Link key={profile.id} href={`/profile/${profile.username}`} className="block border-t border-white/10 py-4"><strong className="text-sm">{profile.display_name}</strong><span className="ml-2 text-xs text-gray-500">@{profile.username}</span></Link>)}</ResultSection>
    <ResultSection title="Brickboard">{bricks.map((brick) => <Link key={brick.id} href={`/brickboard?post=${brick.id}`} className="block border-t border-white/10 py-4"><strong className="text-xs">{brick.author_name}</strong><p className="mt-1 line-clamp-2 text-sm text-gray-300">{brick.content}</p></Link>)}</ResultSection>
  </div></main><Footer /></div>;
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  if (Array.isArray(children) ? children.length === 0 : children == null || children === false) return null;
  return <section><h2 className="mb-2 font-heading text-xl font-black uppercase">{title}</h2>{children}</section>;
}

function Highlight({ value, query }: { value: string; query: string }) {
  if (!query) return value;
  const index = value.toLocaleLowerCase("pt-BR").indexOf(query.toLocaleLowerCase("pt-BR"));
  if (index < 0) return value;
  return <>{value.slice(0, index)}<mark className="bg-brand-orange/25 text-white">{value.slice(index, index + query.length)}</mark>{value.slice(index + query.length)}</>;
}
