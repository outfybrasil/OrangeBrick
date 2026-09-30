import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NewsHero } from "@/components/news/NewsHero";
import { SecondaryNewsCard } from "@/components/news/SecondaryNewsCard";
import { TrendingNewsSection, type TrendingItem } from "@/components/news/TrendingNewsSection";
import { LatestNewsSection } from "@/components/news/LatestNewsSection";
import { BrickboardTrendingSection, type BrickTrendingItem } from "@/components/news/BrickboardTrendingSection";
import { TrendingTopicsSection, type TrendingTopicItem } from "@/components/news/TrendingTopicsSection";
import { NewsArchiveSection } from "@/components/news/NewsArchiveSection";
import { NewsList } from "@/components/feed/NewsList";
import { createPublicServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notícias de Games — Central Editorial | Orange Brick",
  description: "Acompanhe as principais notícias do mundo dos games, análises, furos de reportagem, cobertura da indústria e debates da comunidade no Orange Brick.",
  alternates: {
    canonical: "/noticias",
  },
  openGraph: {
    title: "Notícias de Games — Central Editorial | Orange Brick",
    description: "Tudo o que está acontecendo no mundo dos games com jornalismo ágil e comunidade ativa.",
    url: "/noticias",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notícias de Games — Central Editorial | Orange Brick",
    description: "Tudo o que está acontecendo no mundo dos games no Orange Brick.",
  },
};

interface NewsPageProps {
  searchParams: Promise<{ periodo?: string; q?: string }>;
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const isSearchOrPeriodFilter = Boolean(params.q || (params.periodo && params.periodo === "mes"));

  if (isSearchOrPeriodFilter) {
    const period = params.periodo === "mes" ? "mes" : "todas";
    const search = params.q?.trim().slice(0, 80) || "";
    const supabase = createPublicServerClient();

    let query = supabase
      .from("posts")
      .select(POST_LIST_COLUMNS, { count: "exact" })
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(20);

    if (period === "mes") {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      query = query.gte("published_at", start.toISOString());
    }

    if (search.length >= 2) {
      const sanitized = search.replace(/[^\w\sàáâãéêíóôõúüç]/gi, " ").trim();
      query = query.textSearch("search_vector", sanitized, { type: "websearch", config: "portuguese" });
    }

    const { data, count } = await query;
    const posts = (data || []) as Post[];
    const total = count || 0;

    return (
      <div className="min-h-dvh bg-background-void text-white">
        <SiteHeader variant="strip" />
        <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/noticias"
                className="text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-brand-orange"
              >
                ← Voltar para a Central de Notícias
              </Link>
              <h1 className="mt-3 font-heading text-4xl font-black uppercase sm:text-6xl">
                {search ? `Resultados para &ldquo;${search}&rdquo;` : "Notícias do mês"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                {total} {total === 1 ? "matéria encontrada" : "matérias encontradas"}
              </p>
            </div>
            <nav className="flex border border-white/10" aria-label="Filtro de busca">
              <Link
                href={`/noticias?periodo=mes${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                aria-current={period === "mes" ? "page" : undefined}
                className={`inline-flex min-h-11 items-center px-4 text-xs font-bold uppercase ${
                  period === "mes" ? "bg-brand-orange text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Este mês
              </Link>
              <Link
                href={`/noticias${search ? `?q=${encodeURIComponent(search)}` : ""}`}
                aria-current={period === "todas" ? "page" : undefined}
                className={`inline-flex min-h-11 items-center px-4 text-xs font-bold uppercase ${
                  period === "todas" ? "bg-brand-orange text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                Todas
              </Link>
            </nav>
          </div>
          <NewsList initialPosts={posts} total={total} period={period} search={search} />
        </main>
        <Footer />
      </div>
    );
  }

  const supabase = createPublicServerClient();
  const serviceSupabase = createServiceRoleClient();

  const [
    { data: allPostsData, count: totalPostsCount },
    { data: scoreData },
    { data: topicsData },
    { data: communityData },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select(POST_LIST_COLUMNS, { count: "exact" })
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(30),
    serviceSupabase.rpc("get_post_interest_scores"),
    supabase
      .from("topics")
      .select("id, name, kind")
      .eq("is_active", true)
      .limit(8),
    supabase
      .from("community_posts")
      .select("id, author_name, author_avatar, content, created_at")
      .or("is_pinned.is.null,is_pinned.eq.false")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const allPosts = (allPostsData || []) as Post[];
  const totalPosts = totalPostsCount || allPosts.length;

  let heroPost: Post | null = null;
  let secondaryPosts: Post[] = [];
  let remainingPosts: Post[] = [];

  if (allPosts.length > 0) {
    const featuredIndex = allPosts.findIndex(
      (p) => Boolean(p.is_featured) || p.category === "breaking"
    );
    if (featuredIndex >= 0) {
      heroPost = allPosts[featuredIndex];
      const withoutHero = allPosts.filter((_, idx) => idx !== featuredIndex);
      secondaryPosts = withoutHero.slice(0, 3);
      remainingPosts = withoutHero.slice(3);
    } else {
      heroPost = allPosts[0];
      secondaryPosts = allPosts.slice(1, 4);
      remainingPosts = allPosts.slice(4);
    }
  }

  const candidateIds = allPosts.map((p) => p.id);
  const [reactionsRes, commentsRes] = candidateIds.length > 0
    ? await Promise.all([
        serviceSupabase
          .from("reactions")
          .select("post_id, reaction_type")
          .in("post_id", candidateIds),
        serviceSupabase
          .from("comments")
          .select("post_id")
          .in("post_id", candidateIds),
      ])
    : [{ data: [] }, { data: [] }];

  const hypesByPost: Record<string, number> = {};
  const commentsByPost: Record<string, number> = {};

  const rawReactions = (reactionsRes.data || []) as Array<{ post_id: string; reaction_type: string }>;
  const rawComments = (commentsRes.data || []) as Array<{ post_id: string }>;

  for (const r of rawReactions) {
    if (r.reaction_type === "hype") {
      hypesByPost[r.post_id] = (hypesByPost[r.post_id] || 0) + 1;
    }
  }

  for (const c of rawComments) {
    commentsByPost[c.post_id] = (commentsByPost[c.post_id] || 0) + 1;
  }

  const interestScores: Record<string, number> = {};
  if (scoreData && Array.isArray(scoreData)) {
    for (const row of scoreData as Array<{ post_id: string; interest_score: number | string }>) {
      interestScores[row.post_id] = Number(row.interest_score);
    }
  } else {
    for (const id of candidateIds) {
      const h = hypesByPost[id] || 0;
      const c = commentsByPost[id] || 0;
      interestScores[id] = h * 4 + c * 2;
    }
  }

  const sortedForTrending = [...allPosts].sort(
    (a, b) => (interestScores[b.id] || 0) - (interestScores[a.id] || 0)
  );

  const trendingItems: TrendingItem[] = sortedForTrending.slice(0, 4).map((post) => ({
    post,
    score: interestScores[post.id] || 0,
    hypes: hypesByPost[post.id] || 0,
    comments: commentsByPost[post.id] || 0,
  }));

  const brickRows = (communityData || []) as Array<{
    id: string;
    author_name: string;
    author_avatar: string | null;
    content: string;
    created_at: string;
  }>;

  const brickIds = brickRows.map((b) => b.id);
  const [brickReactionsRes, brickCommentsRes] = brickIds.length > 0
    ? await Promise.all([
        serviceSupabase
          .from("community_reactions")
          .select("post_id, reaction_type")
          .in("post_id", brickIds),
        serviceSupabase
          .from("community_comments")
          .select("post_id")
          .in("post_id", brickIds),
      ])
    : [{ data: [] }, { data: [] }];

  const brickHypes: Record<string, number> = {};
  const brickComments: Record<string, number> = {};

  const rawBrickReactions = (brickReactionsRes.data || []) as Array<{ post_id: string; reaction_type: string }>;
  const rawBrickComments = (brickCommentsRes.data || []) as Array<{ post_id: string }>;

  for (const r of rawBrickReactions) {
    if (r.reaction_type === "hype") {
      brickHypes[r.post_id] = (brickHypes[r.post_id] || 0) + 1;
    }
  }
  for (const c of rawBrickComments) {
    brickComments[c.post_id] = (brickComments[c.post_id] || 0) + 1;
  }

  const brickItems: BrickTrendingItem[] = brickRows.map((row) => ({
    id: row.id,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    content: row.content,
    created_at: row.created_at,
    hypes: brickHypes[row.id] || 0,
    comments: brickComments[row.id] || 0,
  }));

  const rawTopics = (topicsData || []) as Array<{ id: string; name: string; kind: "game" | "subject" }>;
  const fallbackTopics: TrendingTopicItem[] = [
    { id: "gta-6", name: "GTA VI", slug: "grand-theft-auto-vi", isGame: true },
    { id: "playstation", name: "PlayStation", isGame: false },
    { id: "xbox", name: "Xbox", isGame: false },
    { id: "nintendo", name: "Nintendo Switch", isGame: false },
    { id: "pc", name: "PC Gaming", isGame: false },
    { id: "resident-evil", name: "Resident Evil", isGame: false },
  ];

  const topicsList: TrendingTopicItem[] = rawTopics.length > 0
    ? rawTopics.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.id,
        isGame: t.kind === "game",
      }))
    : fallbackTopics;

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <SiteHeader variant="strip" />

      <main id="conteudo-principal" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-white/10 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">
            Central Editorial
          </p>
          <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
            Notícias
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
            Tudo o que está acontecendo agora no mundo dos games.
          </p>
        </header>

        {heroPost && (
          <section aria-labelledby="editorial-highlights-heading" className="mt-8">
            <h2 id="editorial-highlights-heading" className="sr-only">
              Destaques Editoriais
            </h2>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-7">
                <NewsHero
                  post={heroPost}
                  hypes={hypesByPost[heroPost.id] || 0}
                  comments={commentsByPost[heroPost.id] || 0}
                />
              </div>

              {secondaryPosts.length > 0 && (
                <div className="flex flex-col gap-4 lg:col-span-5">
                  {secondaryPosts.map((post) => (
                    <SecondaryNewsCard
                      key={post.id}
                      post={post}
                      hypes={hypesByPost[post.id] || 0}
                      comments={commentsByPost[post.id] || 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <TrendingNewsSection items={trendingItems} />

        <TrendingTopicsSection topics={topicsList} />

        <LatestNewsSection
          initialPosts={remainingPosts.slice(0, 12)}
          initialTotal={totalPosts}
        />

        <BrickboardTrendingSection bricks={brickItems} />

        <NewsArchiveSection />
      </main>

      <Footer />
    </div>
  );
}
