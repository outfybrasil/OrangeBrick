import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { NewsletterForm } from "@/components/contact/NewsletterForm";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a redação do Orange Brick, proponha pautas ou envie denúncias de erros.",
};

export default function ContatoPage() {
  return (
    <main className="min-h-dvh bg-background-void px-3 py-8 text-white sm:px-4 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black uppercase text-white mb-8">Contato</h1>

        <section className="space-y-5 border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Fale com a redação</h2>
            <p className="text-sm leading-relaxed text-gray-300">
              Dúvidas, correções, sugestões de pauta ou informações de bastidores: a mensagem vai
              direto para a equipe do Orange Brick.
            </p>
          </div>
          <ContactForm />
        </section>

        <section className="mt-6 space-y-4 border border-white/10 bg-white/[0.02] p-5 sm:p-7">
          <h2 className="text-lg font-bold text-white">Newsletter semanal</h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Receba o resumo das principais notícias de games, hardware e indústria direto no e-mail.
          </p>
          <div className="relative">
            <NewsletterForm />
          </div>
        </section>

        <section className="mt-6 space-y-3 border border-white/10 bg-white/[0.02] p-5 sm:p-7 text-sm leading-relaxed text-gray-300">
          <h2 className="text-lg font-bold text-white">Canais oficiais</h2>
          <p>Correspondências, propostas comerciais e parcerias: <Link href="/institucional/anuncie" className="font-semibold text-brand-orange hover:text-white">página de publicidade e parcerias</Link>.</p>
          <p>Documentos legais: <Link href="/termos" className="font-semibold text-brand-orange hover:text-white">Termos de Uso</Link> e <Link href="/privacidade" className="font-semibold text-brand-orange hover:text-white">Política de Privacidade</Link>.</p>
        </section>
      </div>
    </main>
  );
}