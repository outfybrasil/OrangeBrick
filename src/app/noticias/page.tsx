import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { Tag } from "@/components/ui/Tag";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function NewsArchivePage({ searchParams }: { searchParams: Promise<{ periodo?: string; q?: string }> }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const params = await searchParams;
  const period = params.periodo === "mes" ? "mes" : "todas";
  const search = params.q?.trim().slice(0, 80) || "";
  const supabase = createPublicServerClient();
  let query = supabase.from("posts").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(100);
  if (period === "mes") {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    query = query.gte("published_at", start.toISOString());
  }
  if (search.length >= 2) {
    const pattern = `%${search.replace(/[%_,]/g, "")}%`;
    query = query.or(`title.ilike.${pattern},summary.ilike.${pattern}`);
  }
  const { data } = await query;
  const posts = (data || []) as Post[];

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex min-h-11 items-center gap-2.5" aria-label="Ir para a página inicial do Orange Brick">
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="" className="h-8 w-auto max-w-[42px] object-contain transition-transform duration-300 group-hover:scale-105" />
            <span className="font-heading text-lg font-black uppercase">Orange<span className="text-brand-orange">_</span>Brick</span>
          </Link>
          <Link href="/" className="text-xs font-bold text-gray-300 transition-colors hover:text-brand-orange">Voltar à home</Link>
        </div>
      </header>
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
        {search && <p className="mt-4 text-sm text-gray-400">{posts.length} {posts.length === 1 ? "resultado" : "resultados"} para “{search}”</p>}
        {posts.length ? (
          <div className="divide-y divide-white/10">
            {posts.map((post) => (
              <article key={post.id} className="grid gap-4 py-6 sm:grid-cols-[12rem_1fr] sm:items-center">
                <Link href={`/posts/${post.slug}`} className="aspect-video overflow-hidden bg-card-slate focus-visible:outline-2 focus-visible:outline-brand-orange">
                  {post.image_url && <img src={post.image_url} alt={post.image_alt || ""} className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]" />}
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-3"><Tag category={post.category} /><time className="text-xs text-gray-500">{new Date(post.published_at || post.created_at).toLocaleDateString("pt-BR")}</time></div>
                  <h2 className="mt-3 font-heading text-xl font-black uppercase leading-tight"><Link href={`/posts/${post.slug}`} className="transition-colors hover:text-brand-orange">{post.title}</Link></h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">{post.summary}</p>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="py-20 text-center text-sm text-gray-400">Nenhuma matéria publicada neste período.</div>}
      </main>
      <Footer />
    </div>
  );
}
