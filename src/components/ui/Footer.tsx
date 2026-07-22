"use client";

import Link from "next/link";
import Image from "next/image";

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
            O portal definitivo de notícias de games. Análises ácidas, hardware de ponta, modding e as últimas notícias do universo gamer de forma rápida, direta e independente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Categorias</h4>
          <div className="flex flex-col gap-2 text-[11px]">
            <Link href="/?category=breaking" className="hover:text-white transition-colors">
              Breaking News
            </Link>
            <Link href="/?category=review" className="hover:text-white transition-colors">
              Reviews Detalhadas
            </Link>
            <Link href="/?category=hardware" className="hover:text-white transition-colors">
              Hardware & Consoles
            </Link>
            <Link href="/?category=opinion" className="hover:text-white transition-colors">
              Opinião & Debates
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Institucional</h4>
          <div className="flex flex-col gap-2 text-[11px]">
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/institucional/anuncie" className="hover:text-white transition-colors">
              Anuncie
            </Link>
            <span className="text-brand-orange-muted font-bold">Versão Beta v2.0</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-brand-orange-muted/5 mt-10 pt-6 text-center text-[10px] text-gray-600">
        <p>
          © {new Date().getFullYear()} Orange Brick Media Group. Todos os direitos reservados.
          Inspirado na estética de portais gamers modernos.
        </p>
      </div>
    </footer>
  );
}
