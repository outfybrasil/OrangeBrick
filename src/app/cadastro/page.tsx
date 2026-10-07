import Link from "next/link";
import { CredentialAuthForm } from "@/components/auth/CredentialAuthForm";

export default function SignupPage() {
  return (
    <main id="conteudo-principal" tabIndex={-1} className="grid min-h-dvh bg-background-void text-white lg:grid-cols-[minmax(0,0.95fr)_minmax(32rem,1.05fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden border-r border-white/10 bg-[#12141a] p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div>
          <Link href="/" className="font-heading text-xl font-black uppercase tracking-wider text-white">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
            <span className="font-mono text-[11px] text-gray-400">Novo Cadastro Gamer</span>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="font-subtitle text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">
            O portal termina. A conversa começa.
          </p>
          <h2 className="mt-4 text-balance font-heading text-5xl font-black leading-[0.98] tracking-[-0.03em] xl:text-6xl">
            Notícia boa não termina no último parágrafo.
          </h2>
          <p className="mt-5 max-w-[54ch] text-base leading-7 text-gray-300">
            Crie sua conta para votar, debater e acumular conquistas com quem realmente acompanha a indústria gamer.
          </p>

          <div className="mt-8 space-y-3.5 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-orange/30 bg-brand-orange/10 text-brand-orange font-bold">
                🎮
              </div>
              <div>
                <strong className="text-white block font-bold">Identidade gamer completa:</strong>
                <span className="text-gray-400">Escolha seu nickname e seu @username exclusivo na comunidade.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">
                🔒
              </div>
              <div>
                <strong className="text-white block font-bold">Acesso seguro e sem paywall:</strong>
                <span className="text-gray-400">100% gratuito, com autenticação por e-mail ou Google OAuth.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold">
                🕹️
              </div>
              <div>
                <strong className="text-white block font-bold">Feed pelas suas plataformas:</strong>
                <span className="text-gray-400">Acompanhe novidades de PC, PlayStation, Xbox, Nintendo e Indies.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Orange Brick · Comunidade aberta</span>
          <Link href="/termos" className="hover:text-gray-300 transition-colors">Termos e Privacidade</Link>
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full">
          <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors lg:hidden">
            <span>← Voltar ao portal</span>
          </Link>
          <CredentialAuthForm mode="signup" />
        </div>
      </section>
    </main>
  );
}
