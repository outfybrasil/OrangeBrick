import Link from "next/link";

export interface TrendingTopicItem {
  id: string;
  name: string;
  slug?: string;
  isGame?: boolean;
  count?: number;
}

interface TrendingTopicsSectionProps {
  topics: TrendingTopicItem[];
}

export function TrendingTopicsSection({ topics }: TrendingTopicsSectionProps) {
  if (!topics || topics.length === 0) return null;

  return (
    <section aria-labelledby="trending-topics-heading" className="my-10 rounded-sm border border-white/10 bg-[#111217] p-5 sm:p-6">
      <div className="flex items-center gap-2 pb-3">
        <span className="inline-block h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 id="trending-topics-heading" className="font-heading text-sm font-black uppercase tracking-wider text-white">
          Assuntos e Jogos em Alta
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {topics.map((topic) => {
          const href = topic.isGame && topic.slug
            ? `/games/${topic.slug}`
            : `/noticias?q=${encodeURIComponent(topic.name)}`;

          return (
            <Link
              key={topic.id}
              href={href}
              className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-white/10 bg-[#16171D] px-3.5 py-1.5 text-xs font-bold text-gray-300 transition-all hover:border-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
            >
              <span>{topic.name}</span>
              {typeof topic.count === "number" && topic.count > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                  {topic.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
