"use client";

import { useAppIcon } from "@/lib/app-icon";

export function AppIconCustomizer() {
  const { appIcon, setAppIcon } = useAppIcon();
  const isInverted = appIcon === "inverted";

  const shortcuts = [
    {
      id: "news",
      title: "Últimas Notícias",
      desc: "Feed de notícias mais recentes",
      iconSrc: isInverted ? "/icons/shortcuts/shortcut-news-inverted.png" : "/icons/shortcuts/shortcut-news.png",
      href: "/?utm_source=pwa_shortcut",
    },
    {
      id: "hype",
      title: "Mais Hypadas",
      desc: "Matérias mais votadas e em alta",
      iconSrc: isInverted ? "/icons/shortcuts/shortcut-hype-inverted.png" : "/icons/shortcuts/shortcut-hype.png",
      href: "/?sort=hyped&utm_source=pwa_shortcut",
    },
    {
      id: "reels",
      title: "Reels & Vídeos",
      desc: "Resumos em vídeo e reels rápidos",
      iconSrc: isInverted ? "/icons/shortcuts/shortcut-reels-inverted.png" : "/icons/shortcuts/shortcut-reels.png",
      href: "/reels?utm_source=pwa_shortcut",
    },
    {
      id: "brick",
      title: "Meu Brick",
      desc: "Perfil, salvos e conquistas",
      iconSrc: isInverted ? "/icons/shortcuts/shortcut-brick-inverted.png" : "/icons/shortcuts/shortcut-brick.png",
      href: "/meu-brick?utm_source=pwa_shortcut",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400">
          Personalize a cor do ícone do aplicativo no seu dispositivo e confira os atalhos rápidos disponíveis ao segurar o ícone na tela inicial.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Estilo do Ícone do App
          </span>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAppIcon("default")}
              aria-pressed={!isInverted}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all ${
                !isInverted
                  ? "border-brand-orange bg-brand-orange/10 shadow-[0_0_20px_rgba(255,94,0,0.2)]"
                  : "border-white/10 bg-black/20 hover:border-white/30"
              }`}
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D0E12] p-2 shadow-md transition-transform group-hover:scale-105">
                <img
                  src="/icons/icon-192.png?v=3"
                  alt="Ícone Laranja Padrão"
                  className="h-full w-full rounded-xl object-contain shadow-sm"
                />
                {!isInverted && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-white text-[10px] font-black shadow">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <strong className="block text-xs font-bold text-white">Padrão Laranja</strong>
                <span className="text-[11px] text-gray-400">Cor oficial #FF5E00</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAppIcon("inverted")}
              aria-pressed={isInverted}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all ${
                isInverted
                  ? "border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "border-white/10 bg-black/20 hover:border-white/30"
              }`}
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D0E12] p-2 shadow-md transition-transform group-hover:scale-105">
                <img
                  src="/icons/icon-inverted-192.png?v=3"
                  alt="Ícone Invertido Monocromático"
                  className="h-full w-full rounded-xl object-contain shadow-sm"
                />
                {isInverted && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-black text-[10px] font-black shadow">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <strong className="block text-xs font-bold text-white">Invertido Stealth</strong>
                <span className="text-[11px] text-gray-400">Branco & Preto</span>
              </div>
            </button>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 text-xs text-gray-300">
            <span className="font-semibold text-white">Como atualizar no celular:</span>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
              Ao alterar, o manifesto e atalhos são atualizados imediatamente. Se o app já estiver instalado na sua tela inicial, basta reinstalar ou atualizar o atalho para fixar a nova cor.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Menu de Atalhos Rápidos (Widgets)
            </span>
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-bold text-gray-300">
              Pressione e segure
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#12141a] p-4 shadow-xl">
            <div className="mb-3.5 flex items-center gap-3 border-b border-white/5 pb-3">
              <img
                src={isInverted ? "/icons/icon-inverted-192.png?v=3" : "/icons/icon-192.png?v=3"}
                alt="Ícone ativo"
                className="h-10 w-10 rounded-xl object-contain shadow-md"
              />
              <div className="min-w-0">
                <span className="block font-heading text-sm font-black text-white">Orange Brick</span>
                <span className="block text-[11px] text-gray-400">Ações rápidas da tela inicial</span>
              </div>
            </div>

            <div className="space-y-2">
              {shortcuts.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#08090C] border border-white/10 p-1">
                    <img
                      src={sc.iconSrc}
                      alt={sc.title}
                      className="h-5 w-5 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white">{sc.title}</span>
                    <span className="block truncate text-[10px] text-gray-400">{sc.desc}</span>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400">
            Disponível nativamente no Android (Google Chrome / Edge / Brave), no iOS (Safari PWA) e na Barra de Tarefas do Windows.
          </p>
        </div>
      </div>
    </div>
  );
}
