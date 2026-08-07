"use client";

import type { CommunityPoll } from "@/lib/types/community";
import { Icon } from "@/components/ui/Icon";

interface GamerPollWidgetProps {
  poll: CommunityPoll;
  onVote: (optionId: number) => void;
}

export function GamerPollWidget({ poll, onVote }: GamerPollWidgetProps) {
  const hasVoted = poll.user_voted_option !== undefined && poll.user_voted_option !== null;

  return (
    <section className="overflow-hidden rounded-xl bg-[#111217] shadow-[0_12px_36px_rgba(0,0,0,0.34)] ring-1 ring-white/10" aria-labelledby="daily-poll-title" aria-describedby="daily-poll-description">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand-orange/20 via-brand-orange/[0.06] to-transparent px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-brand-orange">
          <span className="grid size-5 place-items-center rounded-full bg-brand-orange text-black" aria-hidden="true"><Icon name="question" size={13} /></span>
          Pergunta do dia
        </span>
        <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-400">{poll.total_votes} votos</span>
      </header>

      <div className="p-3.5">
        <h2 id="daily-poll-title" className="font-heading text-sm font-extrabold uppercase leading-snug text-white sm:text-base">
          {poll.question}
        </h2>
        <p id="daily-poll-description" className="mt-1 text-xs leading-normal text-gray-400">
          {hasVoted ? "Resultado da comunidade:" : "Escolha uma alternativa:"}
        </p>

        <div className="mt-3 space-y-1.5" role="radiogroup" aria-label={poll.question}>
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
            const isSelected = poll.user_voted_option === option.id;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onVote(option.id)}
                disabled={hasVoted}
                className={`group relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange disabled:cursor-default ${
                  isSelected
                    ? "border-brand-orange bg-brand-orange/10 text-white"
                    : "border-white/10 bg-[#08090c]/70 text-gray-300 hover:border-brand-orange/60 hover:text-white"
                }`}
              >
                <span className="relative flex items-center gap-2.5">
                  <span className={`grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors ${isSelected ? "border-brand-orange" : "border-gray-600 group-hover:border-brand-orange/70"}`} aria-hidden="true">
                    {isSelected && <span className="size-2 rounded-full bg-brand-orange" />}
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-bold leading-tight">{option.text}</span>
                  {hasVoted && <span className={`shrink-0 text-xs font-extrabold tabular-nums ${isSelected ? "text-brand-orange" : "text-gray-400"}`}>{percentage}%</span>}
                </span>
                {hasVoted && (
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden="true">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-500 ease-out ${isSelected ? "bg-brand-orange" : "bg-gray-500"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <footer className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5 text-xs font-medium text-gray-400" aria-live="polite">
          <span className={`size-1.5 rounded-full ${hasVoted ? "bg-emerald-400" : "bg-brand-orange"}`} aria-hidden="true" />
          {hasVoted ? "Voto registrado." : "Voto anônimo e rápido."}
        </footer>
      </div>
    </section>
  );
}
