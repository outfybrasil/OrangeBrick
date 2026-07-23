interface MediaItem {
  id: string;
  title: string;
  type: "video" | "podcast";
  duration: string;
  thumbnail: string;
  series: string;
}

const MULTIMEDIA_ITEMS: MediaItem[] = [
  {
    id: "1",
    title: "Orange Brick Podcast #45 — O futuro dos consoles de nova geração vale a pena?",
    type: "podcast",
    duration: "1h 24m",
    thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600",
    series: "BrickCast",
  },
  {
    id: "2",
    title: "Por que GTA 6 adiado pode salvar o ano de 2027 dos games?",
    type: "video",
    duration: "14:20",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600",
    series: "Análise Especial",
  },
  {
    id: "3",
    title: "Elden Ring: Shadow of the Erdtree ainda é o melhor DLC de todos os tempos?",
    type: "video",
    duration: "18:45",
    thumbnail: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600",
    series: "Review & Debate",
  },
];

export function MultimediaSection() {
  return (
    <section className="mt-12 mb-8 border-t border-brand-orange-muted/10 pt-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 bg-brand-orange rounded-full animate-pulse" />
          <h2 className="text-xl font-mono font-bold tracking-tight text-white uppercase">
            Multimídia <span className="text-brand-orange font-sans text-sm font-normal lowercase tracking-normal">/ vídeos e podcasts</span>
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-brand-orange hover:text-white cursor-pointer transition-colors duration-200">
          <span>Ver canal completo</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MULTIMEDIA_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col bg-card-slate/60 border border-brand-orange-muted/10 rounded-xl overflow-hidden cursor-pointer hover:border-brand-orange/30 hover:shadow-[0_0_20px_rgba(255,94,0,0.08)] transition-all duration-300 hover:-translate-y-1"
          >
            {/* Thumbnail Wrapper */}
            <div className="relative aspect-video w-full overflow-hidden">
              {/* Image */}
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors duration-300" />

              {/* Tag Tipo */}
              <span
                className={`absolute top-3 left-3 px-2 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-md border ${
                  item.type === "podcast"
                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}
              >
                {item.type}
              </span>

              {/* Duration Badge */}
              <span className="absolute bottom-3 right-3 bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-gray-300 rounded">
                {item.duration}
              </span>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-brand-orange text-white shadow-[0_0_15px_rgba(255,94,0,0.4)] transform scale-90 group-hover:scale-110 opacity-90 group-hover:opacity-100 transition-all duration-300 ease-out">
                  {item.type === "podcast" ? (
                    // Microfone ou Ondas de Som para Podcast
                    <svg className="w-5 h-5 ml-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  ) : (
                    // Play icon
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-brand-orange font-bold uppercase tracking-wider">
                  {item.series}
                </span>
                <h3 className="mt-1 text-sm font-mono font-semibold text-white line-clamp-2 group-hover:text-brand-orange transition-colors duration-200">
                  {item.title}
                </h3>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-xs font-mono text-gray-500">
                <span>Orange Brick Media</span>
                <span>•</span>
                <span>Assistir agora</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
