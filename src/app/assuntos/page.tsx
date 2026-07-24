import Link from "next/link";
import { Footer } from "@/components/ui/Footer";
import { createPublicServerClient } from "@/lib/supabase/server";
import type { Topic } from "@/lib/types/database";

export const revalidate = 300;

export default async function TopicsPage() {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("topics")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(48);
  const topics = (data || []) as Topic[];

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-heading text-lg font-black uppercase">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
          <Link href="/brickboard" className="text-xs font-bold text-gray-300 hover:text-white">
            Brickboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-black uppercase sm:text-5xl">Assuntos</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-300 sm:text-base">
            Matérias, lançamentos e conversas reunidos pelo jogo, sem separar portal e comunidade.
          </p>
        </div>

        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/assuntos/${topic.id}`}
              className="group flex min-h-16 items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <h2 className="truncate font-heading text-base font-black text-white transition-colors group-hover:text-brand-orange sm:text-lg">
                  {topic.name}
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  {topic.description || "Matérias e conversas da comunidade"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-brand-orange">Abrir assunto</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
