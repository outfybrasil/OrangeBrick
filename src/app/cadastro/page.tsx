import Link from "next/link";
import { CredentialAuthForm } from "@/components/auth/CredentialAuthForm";

export default function SignupPage() {
  return (
    <main className="grid min-h-dvh bg-background-void text-white lg:grid-cols-[minmax(0,0.9fr)_minmax(30rem,1.1fr)]">
      <section className="relative hidden min-h-dvh overflow-hidden border-r border-white/10 bg-[#15161b] p-10 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Link href="/" className="font-heading text-xl font-black uppercase tracking-wider text-white">Orange<span className="text-brand-orange">_</span>Brick</Link>
        <div className="max-w-xl">
          <p className="font-subtitle text-xs font-bold uppercase tracking-[0.16em] text-brand-orange">O portal termina. A conversa começa.</p>
          <h2 className="mt-5 text-balance font-heading text-5xl font-black leading-[0.96] tracking-[-0.03em] xl:text-6xl">Notícia boa não termina no último parágrafo.</h2>
          <p className="mt-6 max-w-[58ch] text-base leading-7 text-gray-400">Reaja, vote e debata com leitores que acompanham jogos, hardware e indústria sem conversa genérica.</p>
        </div>
        <p className="text-xs text-gray-600">Orange Brick · Comunidade em beta</p>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full">
          <Link href="/" className="mb-8 inline-flex min-h-11 items-center text-sm font-bold text-gray-400 hover:text-white lg:hidden">← Voltar ao portal</Link>
          <CredentialAuthForm mode="signup" />
        </div>
      </section>
    </main>
  );
}
