import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { NewsList } from "@/components/feed/NewsList";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";
import { POST_LIST_COLUMNS } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arquivo Editorial de Noticias - Orange Brick",
  description: "Explore todas as materias, furos jornalisticos, analises da industria e noticias de games publicadas no Orange Brick.",
  alternates: {
    canonical: "/noticias",
  },
  openGraph: {
    title: "Arquivo Editorial de Noticias | Orange Brick",
    description: "Todas as materias e noticias publicadas no Orange Brick.",
    url: "/noticias",
    type: "website",
  },
};

export default async function NewsArchivePage({ searchParams }: { searchParams: Promise<{ periodo?: string; q?: string }> }) {
  const params = await searchParams;
  const period = params.periodo === "mes" ? "mes" : "todas";
  const search = params.q?.trim().slice(0, 80) || "";
  const supabase = createPublicServerClient();
  let query = supabase.from("posts").select(POST_LIST_COLUMNS, { count: "exact" }).eq("is_published", true).order("published_at", { ascending: false }).limit(20);
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
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Arquivo editorial</p>
            <h1 className="mt-2 font-heading text-4xl font-black uppercase sm:text-6xl">{period === "mes" ? "Notícias do mês" : "Todas as notícias"}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">{period === "mes" ? "Tudo o que o Orange Brick publicou neste mês." : "O arquivo completo das matérias publicadas no Orange Brick."}</p>
          </div>
          <nav className="flex border border-white/10" aria-label="Período das notícias">
            <Link href={`/noticias?periodo=mes${search ? `&q=${encodeURIComponent(search)}` : ""}`} aria-current={period === "mes" ? "page" : undefined} className={`inline-flex min-h-11 items-center px-4 text-xs font-bold uppercase ${period === "mes" ? "bg-brand-orange text-white" : "text-gray-400 hover:text-white"}`}>Este mês</Link>
            <Link href={`/noticias${search ? `?q=${encodeURIComponent(search)}` : ""}`} aria-current={period === "todas" ? "page" : undefined} className={`inline-flex min-h-11 items-center px-4 text-xs font-bold uppercase ${period === "todas" ? "bg-brand-orange text-white" : "text-gray-400 hover:text-white"}`}>Todas</Link>
          </nav>
        </div>
        <form className="mt-6 flex max-w-3xl gap-2" role="search">
          {period === "mes" && <input type="hidden" name="periodo" value="mes" />}
          <label htmlFor="news-search" className="sr-only">Buscar nas notícias</label>
          <input id="news-search" name="q" type="search" defaultValue={search} minLength={2} placeholder="Buscar por título ou assunto" className="min-h-12 min-w-0 flex-1 border border-white/15 bg-card-slate/40 px-4 text-base text-white outline-none placeholder:text-gray-500 focus:border-brand-orange" />
          <button className="min-h-12 bg-brand-orange px-5 text-xs font-black uppercase text-white transition-colors hover:bg-[#d94f00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">Buscar</button>
        </form>
        {search && <p className="mt-4 text-sm text-gray-400">{total} {total === 1 ? "resultado" : "resultados"} para &ldquo;{search}&rdquo;</p>}
        <NewsList initialPosts={posts} total={total} period={period} search={search} />
      </main>
      <Footer />
    </div>
  );
}
