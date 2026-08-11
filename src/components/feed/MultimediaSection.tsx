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
          <h2 id="ob-labs-title" className="font-heading text-2xl font-black uppercase leading-none text-white sm:text-3xl">
            OB Labs no YouTube
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
