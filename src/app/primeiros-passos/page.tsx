"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, CircleUserRound, Gamepad2, LoaderCircle, UsersRound } from "lucide-react";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { hasCompletedOnboarding, ONBOARDING_COMPLETED_AT, ONBOARDING_PENDING } from "@/lib/auth/onboarding";

const steps = [
  {
    icon: CircleUserRound,
    title: "Seu perfil é sua identidade",
    description: "Foto, apelido, bio e plataformas ajudam as pessoas a saber quem está falando. Você pode atualizar esses dados quando quiser.",
    href: "/configuracoes/perfil",
    linkLabel: "Revisar meu perfil",
  },
  {
    icon: UsersRound,
    title: "Siga pessoas e acompanhe a conversa",
    description: "No BrickBoard, siga outros jogadores para encontrar as publicações deles no feed. As notificações mostram respostas e interações com você.",
    href: "/brickboard",
    linkLabel: "Conhecer o BrickBoard",
  },
  {
    icon: Gamepad2,
    title: "Avalie jogos e participe do portal",
    description: "Na página de cada jogo, registre sua nota pessoal. Se ela for pública, ajuda a compor a média da comunidade. Você também pode conversar nos comentários das matérias.",
    href: "/lancamentos",
    linkLabel: "Explorar jogos e lançamentos",
  },
];

export default function FirstStepsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createDataClient(), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/entrar");
      return;
    }
    if (user && hasCompletedOnboarding(user.user_metadata)) {
      router.replace("/brickboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [activeStep]);

  const finishOnboarding = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          [ONBOARDING_PENDING]: false,
          [ONBOARDING_COMPLETED_AT]: new Date().toISOString(),
        },
      });
      if (updateError) throw updateError;
      router.replace("/brickboard");
      router.refresh();
    } catch {
      setError("Não foi possível salvar seu progresso. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <main id="conteudo-principal" tabIndex={-1} className="flex min-h-dvh items-center justify-center bg-background-void">
        <LoaderCircle aria-label="Carregando" className="size-8 animate-spin text-brand-orange" />
      </main>
    );
  }

  const step = steps[activeStep];
  const StepIcon = step.icon;

  return (
    <main id="conteudo-principal" tabIndex={-1} className="flex min-h-dvh items-center justify-center bg-background-void px-4 py-10 text-white sm:px-6">
      <section className="w-full max-w-3xl border border-white/10 bg-[#111217] p-6 sm:p-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href="/" className="font-heading text-lg font-black uppercase tracking-wider text-white">
            Orange<span className="text-brand-orange">_</span>Brick
          </Link>
          <button
            type="button"
            onClick={() => void finishOnboarding()}
            disabled={saving}
            className="min-h-11 text-sm font-semibold text-gray-400 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange disabled:opacity-50"
          >
            Pular explicação
          </button>
        </header>

        <div className="pt-8 sm:pt-12">
          <div className="mb-8 flex items-center gap-3" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={activeStep + 1}>
            <div className="flex gap-1.5" aria-hidden="true">
              {steps.map((item, index) => (
                <span key={item.title} className={`h-1.5 w-10 ${index <= activeStep ? "bg-brand-orange" : "bg-white/15"}`} />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-400">Etapa {activeStep + 1} de {steps.length}</span>
          </div>

          <div aria-live="polite" aria-atomic="true" className="min-h-[19rem]">
            <div className="mb-6 flex size-14 items-center justify-center border border-brand-orange/35 bg-brand-orange/10 text-brand-orange">
              <StepIcon aria-hidden="true" className="size-6" strokeWidth={1.8} />
            </div>
            <h1 ref={headingRef} tabIndex={-1} className="max-w-2xl text-balance font-heading text-3xl font-black leading-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange sm:text-5xl">
              {step.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-300 sm:text-lg sm:leading-8">
              {step.description}
            </p>
            <Link href={step.href} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-orange underline decoration-brand-orange/40 underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-orange">
              {step.linkLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {error && <p role="alert" className="mt-5 border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

          <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setActiveStep((current) => Math.max(0, current - 1))}
              disabled={activeStep === 0 || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold text-gray-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </button>
            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((current) => Math.min(steps.length - 1, current + 1))}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-brand-orange px-5 text-sm font-bold text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:opacity-50"
              >
                Continuar
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finishOnboarding()}
                disabled={saving}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-brand-orange px-5 text-sm font-bold text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Ir para o BrickBoard"}
                {saving ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="size-4" />}
              </button>
            )}
          </footer>

          <p className="mt-5 flex items-center gap-2 text-xs text-gray-500">
            <Bell aria-hidden="true" className="size-3.5 shrink-0" />
            Você pode voltar ao BrickBoard e às matérias quando quiser pelo menu do site.
          </p>
        </div>
      </section>
    </main>
  );
}
