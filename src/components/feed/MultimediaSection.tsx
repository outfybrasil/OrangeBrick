import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { YouTubePlayer } from "@/components/ui/youtube-video-player";

const videos = [
  {
    id: "9oHAB2kelyA",
    title: "HALO: CAMPAIGN EVOLVED – RESGATE DO CAPITÃO! | Gameplay PT-BR #3",
  },
  {
    id: "b0O7ZrPWaog",
    title: "HALO: CAMPAIGN EVOLVED – RESGATE NO ANEL! | Gameplay PT-BR #2",
  },
  {
    id: "ZzE97CIItwI",
    title: "HALO: CAMPAIGN EVOLVED – A LENDA RECOMEÇA! | Gameplay PT-BR #1",
  },
];

export function MultimediaSection() {
  return (
    <section className="mb-10 mt-10 border-y border-white/10 py-6 sm:py-8" aria-labelledby="ob-labs-title">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold text-brand-orange">Gameplays completas</p>
          <h2 id="ob-labs-title" className="flex items-center gap-2 font-heading text-2xl font-black uppercase leading-none text-white sm:text-3xl">
            <Link
              href="https://www.youtube.com/@OB-Labs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir canal OB Labs no YouTube"
              className="shrink-0 text-[#FF0000] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <svg className="h-[0.9em] w-[0.9em]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
              </svg>
            </Link>
            <span>OB Labs no YouTube</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Campanhas, lançamentos e séries organizadas para acompanhar cada jogo do início ao fim.
          </p>
        </div>
        <Link
          href="https://www.youtube.com/@OB-Labs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start border border-brand-orange px-4 text-xs font-black uppercase text-brand-orange transition-colors hover:bg-brand-orange hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange sm:self-auto"
        >
          Ver canal
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-px overflow-hidden bg-white/10 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
        <YouTubePlayer videoId={videos[0].id} title={videos[0].title} className="lg:aspect-auto lg:min-h-[420px]" />
        <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-1">
          {videos.slice(1).map((video) => (
            <YouTubePlayer key={video.id} videoId={video.id} title={video.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
