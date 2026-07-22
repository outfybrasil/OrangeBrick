"use client";

import type { CommunityPoll } from "@/lib/types/community";

interface GamerPollWidgetProps {
  poll: CommunityPoll;
  onVote: (optionId: number) => void;
}

export function GamerPollWidget({ poll, onVote }: GamerPollWidgetProps) {
  const hasVoted = poll.user_voted_option !== undefined && poll.user_voted_option !== null;

  return (
    <div className="bg-gradient-to-br from-brand-orange/10 via-card-slate/70 to-background-void border border-brand-orange/30 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-subtitle font-bold text-brand-orange uppercase tracking-wider bg-brand-orange/15 px-2.5 py-1 rounded-lg border border-brand-orange/30 whitespace-nowrap shrink-0">
            Enquete da Semana
          </span>
        </div>
        <span className="text-[11px] font-subtitle text-gray-400 font-medium whitespace-nowrap">
          {poll.total_votes} votos acumulados
        </span>
      </div>

      <h3 className="font-heading text-sm sm:text-base font-bold text-white leading-snug">
        {poll.question}
      </h3>

      <div className="space-y-2.5">
        {poll.options.map((option) => {
          const percentage = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
          const isSelected = poll.user_voted_option === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onVote(option.id)}
              disabled={hasVoted}
              className={`group relative w-full text-left p-3 rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                isSelected
                  ? "bg-brand-orange/20 border-brand-orange text-white shadow-[0_0_15px_rgba(255,94,0,0.2)]"
                  : hasVoted
                  ? "bg-background-void/50 border-brand-orange-muted/15 text-gray-300"
                  : "bg-background-void/70 border-brand-orange-muted/20 text-gray-200 hover:border-brand-orange/50 hover:bg-card-slate"
              }`}
            >
              {/* BARRA DE PORCENTAGEM (EXIBIDA APÓS VOTAR) */}
              {hasVoted && (
                <div
                  style={{ width: `${percentage}%` }}
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                    isSelected ? "bg-brand-orange/30" : "bg-card-slate/80"
                  }`}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3 text-xs font-subtitle">
                <span className="font-semibold">{option.text}</span>
                {hasVoted ? (
                  <span className="font-bold tabular-nums shrink-0">
                    {percentage}% {isSelected && "✓"}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Votar →
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
