"use client";

import Link from "next/link";
import Image from "next/image";

export function CommunityBanner() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 my-8 relative overflow-hidden rounded-2xl border border-brand-orange-muted/20 bg-gradient-to-r from-card-slate/90 via-background-void/95 to-card-slate/90 p-6 md:p-8 shadow-xl">
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-center md:text-left">
          <div className="shrink-0 p-3 bg-brand-orange/15 rounded-2xl border border-brand-orange/30 shadow-[0_0_15px_rgba(255,94,0,0.2)]">
            <Image
              src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
              alt="Orange Brick"
              width={64}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-orange animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-orange">
                Comunidade Orange Brick
              </span>
            </div>
            <h3 className="font-mono text-lg md:text-xl font-bold text-white uppercase tracking-wide">
              Vote, comente e opine no <span className="text-brand-orange">Brickboard</span>
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-1 max-w-xl">
              Aqui a sua opinião faz barulho. Participe dos debates de games, dê o seu Hype ou Flop nas notícias e ajude a definir o radar do dia!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/brickboard"
            className="px-5 py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(255,94,0,0.3)] transition-all duration-200"
          >
            Acessar Brickboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
