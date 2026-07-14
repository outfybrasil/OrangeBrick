"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#08090C] border-t border-brand-orange-muted/10 py-12 text-gray-500 text-xs font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Coluna 1: Info e Redes */}
        <div className="flex flex-col gap-4 md:col-span-2">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/Logo Tijolo Quebrado.PNG"
              alt="Orange Brick Logo Icon"
              className="h-12 w-auto object-contain"
            />
            <span className="text-2xl font-mono font-black text-white uppercase tracking-wider">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans max-w-sm leading-relaxed">
            O portal definitivo de notícias de games. Análises ácidas, hardware de ponta, modding e as últimas notícias do universo gamer de forma rápida, direta e independente.
          </p>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            <a href="#" className="hover:text-purple-400 transition-colors uppercase font-bold">Twitch</a>
            <span>/</span>
            <a href="#" className="hover:text-red-500 transition-colors uppercase font-bold">YouTube</a>
            <span>/</span>
            <a href="#" className="hover:text-blue-400 transition-colors uppercase font-bold">Discord</a>
            <span>/</span>
            <a href="#" className="hover:text-brand-orange transition-colors uppercase font-bold">Twitter</a>
          </div>
        </div>

        {/* Coluna 2: Categorias */}
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

        {/* Coluna 3: Institucional */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Institucional</h4>
          <div className="flex flex-col gap-2 text-[11px]">
            <Link href="/institucional/anuncie" className="hover:text-white transition-colors">
              Anuncie Conosco
            </Link>
            <Link href="/institucional/termos" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/institucional/privacidade" className="hover:text-white transition-colors">
              Política de Privacidade
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
