import Link from "next/link";
import { CredentialAuthForm } from "@/components/auth/CredentialAuthForm";

export default function LoginPage() {
  return (
    <main id="conteudo-principal" tabIndex={-1} className="grid min-h-dvh bg-background-void text-white lg:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.05fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden border-r border-white/10 bg-[#12141a] p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div>
          <Link href="/" className="font-heading text-xl font-black uppercase tracking-wider text-white">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-gray-400">Portal & Comunidade Gamer</span>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="font-subtitle text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
            Sua comunidade gamer
          </p>
          <h2 className="mt-4 text-balance font-heading text-5xl font-black leading-[0.98] tracking-[-0.03em] xl:text-6xl">
            Continue de onde a discussão parou.
          </h2>
          <p className="mt-5 max-w-[54ch] text-base leading-7 text-gray-300">
            Acesse seus votos, suas discussões no Brickboard e matérias salvas com seu perfil gamer.
          </p>

          <dl className="mt-8 border-b border-white/10">
            <div className="grid gap-1 border-t border-white/10 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
              <dt className="font-heading text-sm font-bold text-white">Troca rápida de contas</dt>
              <dd className="text-sm leading-6 text-gray-400">Alterne entre múltiplos perfis no mesmo dispositivo com 1 clique.</dd>
            </div>
            <div className="grid gap-1 border-t border-white/10 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
              <dt className="font-heading text-sm font-bold text-white">Radar de Lançamentos</dt>
              <dd className="text-sm leading-6 text-gray-400">Vote no hype dos lançamentos e registre os jogos que você já garantiu.</dd>
            </div>
            <div className="grid gap-1 border-t border-white/10 py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6">
              <dt className="font-heading text-sm font-bold text-white">Brickboard & Conquistas</dt>
              <dd className="text-sm leading-6 text-gray-400">Ganhe XP interagindo com a comunidade e desbloqueie títulos exclusivos.</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Orange Brick · Versão 2.4</span>
          <Link href="/sobre" className="hover:text-gray-300 transition-colors">Sobre o portal</Link>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full">
          <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors lg:hidden">
            <span>← Voltar ao portal</span>
          </Link>
          <CredentialAuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}
