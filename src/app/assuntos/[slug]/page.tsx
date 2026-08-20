import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/Footer";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { CommunityPostRow, Post, ReleaseRadarItem, Topic } from "@/lib/types/database";
import { FollowButton } from "@/components/topics/FollowButton";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 300;

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const { data: topicData } = await supabase
    .from("topics")
    .select("*")
    .eq("id", slug)
    .eq("is_active", true)
    .maybeSingle();

  const topic = topicData as Topic | null;
  if (!topic) return { title: "Assunto não encontrado" };

  const [{ count: articlesCount }, { count: bricksCount }, { count: releaseCount }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true).eq("topic_id", topic.id),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("topic_id", topic.id),
    supabase.from("release_radar_items").select("id", { count: "exact", head: true }).eq("is_active", true).eq("topic_id", topic.id),
  ]);

  const hasContent = (articlesCount || 0) > 0 || (bricksCount || 0) > 0 || (releaseCount || 0) > 0;
  const isCatalog = topic.id.startsWith("catalog-");

  const title = `${topic.name} — Notícias, Lançamentos e Comunidade`;
  const description = topic.description || `Acompanhe notícias, matérias e discussões da comunidade sobre ${topic.name} no Orange Brick.`;
  const canonical = `/assuntos/${topic.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: !hasContent || isCatalog ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: `${topic.name} | Orange Brick`,
      description,
      url: canonical,
      type: "website",
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const siteUrl = getSiteUrl();
  const { data: topicData } = await supabase
    .from("topics")
    .select("*")
    .eq("id", slug)
    .eq("is_active", true)
    .maybeSingle();
  const topic = topicData as Topic | null;
  if (!topic) notFound();

  const [{ data: releaseData }, { data: postData }, { data: communityData }] = await Promise.all([
    supabase
      .from("release_radar_items")
      .select("*")
      .eq("topic_id", topic.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("*")
      .eq("is_published", true)
      .eq("topic_id", topic.id)
      .order("published_at", { ascending: false }),
    supabase
      .from("community_posts")
      .select("*")
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const release = releaseData as ReleaseRadarItem | null;
  const articles = (postData || []) as Post[];
  const bricks = (communityData || []) as CommunityPostRow[];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Assuntos", item: `${siteUrl}/assuntos` },
      { "@type": "ListItem", position: 3, name: topic.name, item: `${siteUrl}/assuntos/${topic.id}` },
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${topic.name} — Notícias e Conversas`,
    description: topic.description || `Matérias e discussões da comunidade sobre ${topic.name}.`,
    url: `${siteUrl}/assuntos/${topic.id}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Orange Brick",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c")}</script>
      <script type="application/ld+json">{JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c")}</script>
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/assuntos" className="text-xs font-bold text-gray-300 hover:text-white">
            Todos os assuntos
          </Link>
          <Link href="/" className="font-heading text-base font-black uppercase">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="border-y border-brand-orange/30 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-orange">Central do assunto</p>
              <h1 className="mt-2 font-heading text-3xl font-black uppercase sm:text-5xl">{topic.name}</h1>
              {topic.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">{topic.description}</p>}
            </div>
            <FollowButton type="topic" value={topic.id} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-300">
            {release && <span>{release.release_label}</span>}
            {release && <span>{release.platforms.join(", ")}</span>}
            {release && (
              <Link href={`/lancamentos#${release.id}`} className="font-bold text-brand-orange hover:text-white">
                Ver no Radar
              </Link>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-px bg-white/10 border border-white/10 sm:grid-cols-3">
          <div className="bg-background-void p-4"><p className="text-2xl font-black text-white">{articles.length}</p><p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Matérias publicadas</p></div>
          <div className="bg-background-void p-4"><p className="text-2xl font-black text-white">{bricks.length}</p><p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Conversas recentes</p></div>
          <div className="bg-background-void p-4"><p className="text-2xl font-black text-brand-orange">{release ? "No radar" : "Em cobertura"}</p><p className="mt-1 text-xs uppercase tracking-wide text-gray-500">Estado do assunto</p></div>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <h2 className="font-heading text-xl font-black uppercase">Matérias</h2>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {articles.length === 0 ? (
                <p className="py-6 text-sm text-gray-400">Ainda não há matéria publicada sobre este assunto.</p>
              ) : (
                articles.map((article) => (
                  <Link key={article.id} href={`/posts/${article.slug}`} className="block py-5">
                    <h3 className="font-heading text-lg font-black text-white hover:text-brand-orange">{article.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-400">{article.summary}</p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-xl font-black uppercase">Brickboard</h2>
              <Link href={`/brickboard?topic=${encodeURIComponent(topic.id)}`} className="text-xs font-bold text-brand-orange">
                Abrir conversa
              </Link>
            </div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {bricks.length === 0 ? (
                <p className="py-6 text-sm text-gray-400">A comunidade ainda não publicou sobre este assunto.</p>
              ) : (
                bricks.map((brick) => (
                  <article key={brick.id} className="py-5">
                    <p className="text-xs font-bold text-white">{brick.author_name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{brick.content}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
