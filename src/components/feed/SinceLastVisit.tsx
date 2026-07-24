"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";

const LAST_VISIT_KEY = "orange-brick-last-visit";
const VISIT_START_KEY = "orange-brick-visit-start";

interface VisitSummary {
  articles: number;
  conversations: number;
}

export function SinceLastVisit() {
  const supabase = useMemo(() => createDataClient(), []);
  const [summary, setSummary] = useState<VisitSummary | null>(null);

  useEffect(() => {
    const currentVisit = new Date().toISOString();
    const sessionStart = window.sessionStorage.getItem(VISIT_START_KEY);
    const previousVisit = sessionStart || window.localStorage.getItem(LAST_VISIT_KEY);

    if (!sessionStart) {
      window.sessionStorage.setItem(VISIT_START_KEY, previousVisit || currentVisit);
    }
    window.localStorage.setItem(LAST_VISIT_KEY, currentVisit);

    if (!previousVisit) return;

    const loadSummary = async () => {
      const [articlesResult, conversationsResult] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("is_published", true)
          .gt("published_at", previousVisit),
        supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .gt("created_at", previousVisit),
      ]);

      if (articlesResult.error || conversationsResult.error) return;

      const articles = articlesResult.count || 0;
      const conversations = conversationsResult.count || 0;
      if (articles === 0 && conversations === 0) return;
      setSummary({ articles, conversations });
    };

    void loadSummary();
  }, [supabase]);

  if (!summary) return null;

  return (
    <aside
      aria-label="Novidades desde sua última visita"
      className="flex flex-col gap-3 border-y border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">Desde sua última visita</p>
        <p className="mt-1 text-sm text-gray-300">
          {summary.articles} {summary.articles === 1 ? "matéria nova" : "matérias novas"}
          <span aria-hidden="true"> · </span>
          {summary.conversations} {summary.conversations === 1 ? "nova conversa" : "novas conversas"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs font-bold">
        {summary.articles > 0 && (
          <Link
            href="#ultimas-noticias"
            data-home-event="return_summary"
            data-home-target="articles"
            className="min-h-11 content-center text-brand-orange transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Ver matérias
          </Link>
        )}
        {summary.conversations > 0 && (
          <Link
            href="/brickboard"
            data-home-event="return_summary"
            data-home-target="conversations"
            className="min-h-11 content-center text-brand-orange transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            Ver conversas
          </Link>
        )}
      </div>
    </aside>
  );
}
