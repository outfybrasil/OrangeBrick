import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Footer } from "@/components/ui/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { createPublicServerClient } from "@/lib/supabase/server";
import { normalizeNewsSearch } from "@/lib/news-query";
import type { CommunityPostRow, Post, Profile, ReleaseRadarItem } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Busca",
  robots: {
    index: false,
    follow: true,
  },
  alternates: { canonical: "/busca" },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q?.trim().slice(0, 80) || "";
  const currentTab = resolvedParams.tab || "all";
  const supabase = createPublicServerClient();
  const normalizedQuery = normalizeNewsSearch(query);
  const pattern = `%${normalizedQuery}%`;
  const results =
    normalizedQuery.length >= 2
      ? await Promise.all([
          supabase
            .from("posts")
            .select("*")
            .eq("is_published", true)
            .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
            .limit(16),
          supabase
            .from("release_radar_items")
            .select("*")
            .eq("is_active", true)
            .ilike("game", pattern)
            .limit(12),
          supabase
            .from("profiles")
            .select("*")
            .or(`display_name.ilike.${pattern},username.ilike.${pattern}`)
            .limit(10),
          supabase
            .from("community_posts")
            .select("*")
            .ilike("content", pattern)
            .limit(16),
        ])
      : [];
  const posts = (results[0]?.data || []) as Post[];
  const releases = (results[1]?.data || []) as ReleaseRadarItem[];
  const profiles = (results[2]?.data || []) as Profile[];
  const bricks = (results[3]?.data || []) as CommunityPostRow[];
  const total = posts.length + releases.length + profiles.length + bricks.length;

  const tabs = [
    { id: "all", label: "Tudo", count: total },
    { id: "posts", label: "Notícias", count: posts.length },
    { id: "releases", label: "Jogos", count: releases.length },
    { id: "bricks", label: "Bricks", count: bricks.length },
    { id: "profiles", label: "Leitores", count: profiles.length },
  ];

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <SiteHeader variant="strip" />
      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">
          Busca universal
        </p>
        <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase">
          Encontre tudo.
        </h1>

        <form className="mt-6 flex max-w-3xl gap-2" method="GET" action="/busca">
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              inputMode="search"
              name="q"
              defaultValue={query}
              minLength={2}
              required
              placeholder="Matéria, jogo, leitor ou conversa"
              aria-label="Buscar matérias, jogos, leitores ou conversas"
              className="min-h-12 w-full rounded-xl border border-white/15 bg-card-slate/40 px-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-brand-orange/60"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 shrink-0 rounded-xl bg-brand-orange px-6 text-xs font-black uppercase text-black transition-colors hover:bg-brand-orange/90 active:scale-95"
          >
            Buscar
          </button>
        </form>

        {query && (
          <div className="mt-6 space-y-4">
            <p className="text-xs sm:text-sm text-gray-400">
              {total} {total === 1 ? "resultado encontrado" : "resultados encontrados"} para “<strong className="text-white">{query}</strong>”
            </p>

            {total > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 pb-3 scrollbar-none snap-x">
                {tabs.map((tab) => {
                  const isActive = currentTab === tab.id;
                  const href = `/busca?q=${encodeURIComponent(query)}${
                    tab.id === "all" ? "" : `&tab=${tab.id}`
                  }`;
                  return (
                    <Link
                      key={tab.id}
                      href={href}
                      className={`inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-brand-orange text-white"
                          : "border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                          isActive ? "bg-black/20 text-white" : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {query && results.some((result) => result.error) && (
          <p role="status" className="mt-3 text-sm text-gray-300">
            A busca está incompleta. Algumas áreas não responderam.
          </p>
        )}

        {normalizedQuery.length >= 2 && total === 0 && !results.some((result) => result.error) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-sm text-gray-300">
            <p>Nenhum resultado encontrado. Tente o nome do jogo, da empresa ou uma palavra mais curta.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/noticias"
                className="inline-flex min-h-11 items-center rounded-xl bg-brand-orange px-4 text-xs font-bold text-white transition-colors hover:bg-brand-orange/90"
              >
                Explorar notícias
              </Link>
              <Link
                href="/brickboard"
                className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-xs font-bold text-white transition-colors hover:border-white/40"
              >
                Abrir Brickboard
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {(currentTab === "all" || currentTab === "posts") && (
            <ResultSection
              title="Notícias"
              error={Boolean(results[0]?.error)}
              retryHref={`/busca?q=${encodeURIComponent(query)}`}
            >
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.slug}`}
                  className="block border-t border-white/10 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  <strong className="font-heading text-sm uppercase text-white hover:text-brand-orange transition-colors">
                    <Highlight value={post.title} query={query} />
                  </strong>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">
                    <Highlight value={post.summary} query={query} />
                  </p>
                </Link>
              ))}
            </ResultSection>
          )}

          {(currentTab === "all" || currentTab === "releases") && (
            <ResultSection
              title="Lançamentos no Radar"
              error={Boolean(results[1]?.error)}
              retryHref={`/busca?q=${encodeURIComponent(query)}`}
            >
              {releases.map((release) => (
                <Link
                  key={release.id}
                  href={`/lancamentos#release-${release.id}`}
                  className="block border-t border-white/10 py-4 text-sm font-bold text-white transition-colors hover:text-brand-orange"
                >
                  {release.game} <span className="font-normal text-gray-500">· {release.release_label}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {(currentTab === "all" || currentTab === "profiles") && (
            <ResultSection
              title="Leitores"
              error={Boolean(results[2]?.error)}
              retryHref={`/busca?q=${encodeURIComponent(query)}`}
            >
              {profiles.map((profile) => (
                <Link
                  key={profile.id}
                  href={`/profile/${profile.username}`}
                  className="block border-t border-white/10 py-4 transition-colors hover:text-brand-orange"
                >
                  <strong className="text-sm font-bold text-white">{profile.display_name}</strong>
                  <span className="ml-2 text-xs text-gray-500">@{profile.username}</span>
                </Link>
              ))}
            </ResultSection>
          )}

          {(currentTab === "all" || currentTab === "bricks") && (
            <ResultSection
              title="Brickboard"
              error={Boolean(results[3]?.error)}
              retryHref={`/busca?q=${encodeURIComponent(query)}`}
            >
              {bricks.map((brick) => (
                <Link
                  key={brick.id}
                  href={`/brickboard?post=${brick.id}`}
                  className="block border-t border-white/10 py-4 transition-colors hover:border-brand-orange/40"
                >
                  <strong className="text-xs font-bold text-brand-orange">{brick.author_name}</strong>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-300">{brick.content}</p>
                </Link>
              ))}
            </ResultSection>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ResultSection({
  title,
  children,
  error,
  retryHref,
}: {
  title: string;
  children: ReactNode;
  error?: boolean;
  retryHref?: string;
}) {
  if (error) {
    return (
      <section>
        <h2 className="mb-2 font-heading text-lg font-black uppercase text-white">{title}</h2>
        <div role="alert" className="border-t border-white/10 py-4 text-sm text-gray-300">
          <p>Não foi possível pesquisar nesta área.</p>
          <Link href={retryHref || "/busca"} className="mt-2 inline-flex min-h-11 items-center text-brand-orange underline underline-offset-4">
            Tentar novamente
          </Link>
        </div>
      </section>
    );
  }
  if (Array.isArray(children) ? children.length === 0 : children == null || children === false) return null;
  return (
    <section>
      <h2 className="mb-2 font-heading text-lg font-black uppercase text-white">{title}</h2>
      {children}
    </section>
  );
}

function Highlight({ value, query }: { value: string; query: string }) {
  if (!query) return value;
  const index = value.toLocaleLowerCase("pt-BR").indexOf(query.toLocaleLowerCase("pt-BR"));
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="bg-brand-orange/25 text-white">{value.slice(index, index + query.length)}</mark>
      {value.slice(index + query.length)}
    </>
  );
}
