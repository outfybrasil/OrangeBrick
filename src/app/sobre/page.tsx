import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Sobre e política editorial",
  description: "Conheça a proposta, os critérios editoriais e a política de correções do Orange Brick.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <>
      <main className="min-h-dvh bg-background-void text-white">
        <header className="border-b border-white/10">
          <div className="mx-auto flex min-h-16 max-w-4xl items-center px-4 sm:px-6">
            <Link href="/" className="inline-flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Página inicial</Link>
          </div>
        </header>
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
          <h1 className="max-w-3xl font-heading text-[clamp(2.5rem,8vw,5rem)] font-black leading-[0.94] tracking-[-0.03em]">Notícia, contexto e comunidade no mesmo lugar.</h1>
          <p className="mt-6 max-w-[70ch] text-base leading-7 text-gray-300">O Orange Brick é um projeto editorial independente sobre games, hardware e indústria. A proposta é publicar informação direta e conectar cada matéria a uma comunidade em que leitores possam conversar, construir reputação e acompanhar assuntos.</p>

          <div className="mt-12 space-y-10 border-t border-white/10 pt-10">
            <section>
              <h2 className="font-heading text-2xl font-bold">Como trabalhamos</h2>
              <div className="mt-4 max-w-[70ch] space-y-4 text-sm leading-7 text-gray-300">
                <p>Priorizamos fontes oficiais e veículos reconhecidos. Rumores são identificados como rumores, títulos de jogos permanecem no nome oficial e toda matéria deve apontar suas fontes.</p>
                <p>Textos não são copiados de outros veículos. Informações são verificadas, reorganizadas e escritas para o público brasileiro. Conteúdo de opinião é identificado e separado da cobertura factual.</p>
              </div>
            </section>

            <section>
              <h2 className="font-heading text-2xl font-bold">Uso de inteligência artificial</h2>
              <p className="mt-4 max-w-[70ch] text-sm leading-7 text-gray-300">Ferramentas de IA podem apoiar pesquisa, organização, revisão técnica e criação de imagens ilustrativas quando indicado pelo contexto. A decisão editorial, a revisão e a publicação permanecem sob responsabilidade humana. Screenshots e artes oficiais são priorizados quando o assunto é um jogo específico.</p>
            </section>

            <section>
              <h2 className="font-heading text-2xl font-bold">Correções e transparência</h2>
              <p className="mt-4 max-w-[70ch] text-sm leading-7 text-gray-300">Se uma informação estiver errada, a matéria será corrigida. Pedidos de correção, dúvidas sobre fontes e denúncias de direitos autorais podem ser enviados para <a href="mailto:orangebrick0@gmail.com" className="font-bold text-brand-orange hover:text-white">orangebrick0@gmail.com</a>.</p>
            </section>

            <section>
              <h2 className="font-heading text-2xl font-bold">Comunidade</h2>
              <p className="mt-4 max-w-[70ch] text-sm leading-7 text-gray-300">O Brickboard existe para debate, não para assédio. Publicações podem ser denunciadas, a participação possui limites contra spam e XP não substitui qualidade. Conteúdos que violem os termos podem ser removidos.</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
