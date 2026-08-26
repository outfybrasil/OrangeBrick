"use client";

import { useMemo } from "react";
import {
  validateEditorialQuality,
  type EditorialBlock,
  type EditorialQualityItem,
} from "@/lib/content-validation";

type EditorialQualityChecklistProps = {
  summary: string;
  body: EditorialBlock[];
  sourcesText: string;
  quoteText: string;
  quoteAuthor: string;
  quoteSourceUrl: string;
  absenceRegistered?: boolean;
};

export function EditorialQualityChecklist({
  summary,
  body,
  sourcesText,
  quoteText,
  quoteAuthor,
  quoteSourceUrl,
  absenceRegistered,
}: EditorialQualityChecklistProps) {
  const items: EditorialQualityItem[] = useMemo(
    () =>
      validateEditorialQuality({
        summary,
        body,
        sourcesText,
        quoteText,
        quoteAuthor,
        quoteSourceUrl,
        absenceRegistered,
      }),
    [summary, body, sourcesText, quoteText, quoteAuthor, quoteSourceUrl, absenceRegistered],
  );

  const completed = items.filter((i) => i.complete).length;
  const pending = items.length - completed;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
          Qualidade editorial
        </h3>
        <span
          className={`text-xs font-bold ${pending === 0 ? "text-emerald-400" : "text-amber-400"}`}
        >
          {pending === 0 ? "Pronta" : `${pending} pendente${pending > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-[width] duration-500 ${pending === 0 ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${(completed / items.length) * 100}%` }}
        />
      </div>

      <div className="space-y-2 text-xs">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 ${item.complete ? "text-emerald-400" : "text-amber-400"}`}
              aria-hidden="true"
            >
              {item.complete ? "✓" : "○"}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={
                  item.complete ? "text-gray-400 line-through" : "text-gray-200"
                }
              >
                {item.label}
              </span>
              {item.detail && (
                <span className="ml-1.5 text-[10px] text-gray-500">
                  ({item.detail})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {pending > 0 && (
        <div
          role="status"
          className="mt-1 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-200/90"
        >
          {pending === 1
            ? "1 item precisa de atenção antes de publicar."
            : `${pending} itens precisam de atenção antes de publicar.`}
        </div>
      )}
    </div>
  );
}
