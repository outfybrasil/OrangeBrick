"use client";

import Link from "next/link";
import PushSetup from "@/components/PushSetup";

export function Footer() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <footer className="bg-[#08090C] border-t border-brand-orange-muted/10 py-8 sm:py-12 text-gray-400 text-xs font-subtitle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
        <div className="flex flex-col gap-3 sm:gap-4 sm:col-span-2">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <img
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick Logo Icon"
              style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
              className="h-9 sm:h-10 w-auto object-contain shrink-0"
            />
            <span className="text-xl sm:text-2xl font-heading font-black text-white uppercase tracking-wider">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-sans max-w-sm leading-relaxed">
            Notícias de games, indústria e hardware com apuração direta, contexto e espaço para debate.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Categorias</h4>
          <div className="flex flex-col text-[11px]">
            <Link href="/?category=breaking" className="flex min-h-11 items-center transition-colors hover:text-white">
              Breaking News
            </Link>
            <Link href="/?category=review" className="flex min-h-11 items-center transition-colors hover:text-white">
              Reviews Detalhadas
            </Link>
            <Link href="/?category=hardware" className="flex min-h-11 items-center transition-colors hover:text-white">
              Hardware & Consoles
            </Link>
            <Link href="/?category=opinion" className="flex min-h-11 items-center transition-colors hover:text-white">
              Opinião & Debates
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Institucional</h4>
          <div className="flex flex-col text-[11px]">
            <Link href="/termos" className="flex min-h-11 items-center transition-colors hover:text-white">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="flex min-h-11 items-center transition-colors hover:text-white">
              Política de Privacidade
            </Link>
            <Link href="/institucional/anuncie" className="flex min-h-11 items-center transition-colors hover:text-white">
              Anuncie
            </Link>
            <span className="text-brand-orange-muted font-bold">Versão Beta v2.0</span>
            <PushSetup />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-brand-orange-muted/5 mt-10 pt-6 text-center text-[10px] text-gray-600">
        <p suppressHydrationWarning>
          © 2026 Orange Brick. Conteúdo editorial protegido nos termos da legislação aplicável.
        </p>
      </div>
    </footer>
  );
}
