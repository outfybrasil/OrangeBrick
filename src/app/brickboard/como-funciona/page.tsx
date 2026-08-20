import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Como Funciona o XP e a Progressão do Brickboard",
  description: "Entenda o sistema de experiência (XP), ligas, temporadas e regras de progressão da comunidade gamer do Orange Brick.",
  alternates: {
    canonical: "/brickboard/como-funciona",
  },
};

const actions = [
  ["Publicar um Brick", "+10 XP", "3 por dia"],
  ["Comentar", "+5 XP", "10 por dia"],
  ["Reagir", "+1 XP", "15 por dia"],
  ["Votar na pergunta do dia", "+3 XP", "1 por dia"],
  ["Compartilhar com contexto", "+4 XP", "3 por dia"],
  ["Receber uma reação", "+2 XP", "20 por dia"],
  ["Receber comentário", "+5 XP", "10 por dia"],
];

export default function ProgressionGuidePage() {
  return (
    <main className="min-h-dvh bg-background-void text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/brickboard" className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Brickboard</Link>
          <Link href="/brickboard/ranking" className="flex min-h-11 items-center text-xs font-bold text-brand-orange hover:text-white">Ver ranking</Link>
        </div>
      </header>
      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="max-w-4xl">
          <p className="text-xs font-bold text-brand-orange">Progressão do Brickboard</p>
          <h1 className="mt-3 font-heading text-[clamp(2.5rem,8vw,5rem)] font-black leading-[0.92] tracking-[-0.03em]">Contribuição vale mais que barulho.</h1>
          <p className="mt-6 max-w-[68ch] text-base leading-7 text-gray-300">Seu XP vitalício registra toda a sua trajetória. A liga trimestral reconhece quem está contribuindo agora, sem apagar o que veio antes.</p>
        </header>

        <section className="mt-16">
          <h2 className="font-heading text-2xl font-bold">Como ganhar XP</h2>
          <div className="mt-5 overflow-x-auto border-y border-white/10">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-gray-500">
                <tr><th className="py-3">Ação</th><th className="py-3">Valor</th><th className="py-3 text-right">Limite</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {actions.map(([action, xp, limit]) => (
                  <tr key={action}><td className="py-4 text-gray-200">{action}</td><td className="py-4 font-bold text-brand-orange">{xp}</td><td className="py-4 text-right text-gray-400">{limit}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <section className="border-t border-brand-orange/50 pt-5">
            <h2 className="font-heading text-2xl font-bold">Nível vitalício</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">O nível nunca diminui. Cada novo nível exige mais XP, por isso níveis altos representam participação consistente ao longo do tempo.</p>
          </section>
          <section className="border-t border-white/20 pt-5">
            <h2 className="font-heading text-2xl font-bold">Liga trimestral</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">A liga usa somente o XP conquistado na temporada. No encerramento, a colocação entra para o histórico e a disputa seguinte começa do zero.</p>
          </section>
          <section className="border-t border-white/20 pt-5">
            <h2 className="font-heading text-2xl font-bold">Qualidade</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">Interações recebidas também geram XP. A mesma pessoa não pode premiar repetidamente o mesmo conteúdo e interações próprias não contam.</p>
          </section>
          <section className="border-t border-white/20 pt-5">
            <h2 className="font-heading text-2xl font-bold">Jogo limpo</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">Spam, combinações artificiais e conteúdo removido podem causar revogação de XP. Toda alteração fica registrada no histórico do proprietário.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
