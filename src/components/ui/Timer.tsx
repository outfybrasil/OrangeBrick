"use client";

import { useReducer, useEffect } from "react";
import { timeAgo } from "@/lib/utils/time-ago";

interface TimerProps {
  date: string;
}

export function Timer({ date }: TimerProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const parsedDate = new Date(date);
  const exactDate = Number.isNaN(parsedDate.getTime())
    ? ""
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(parsedDate);

  useEffect(() => {
    const interval = setInterval(refresh, 60_000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <time dateTime={date} className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-300">
      {exactDate}{exactDate ? " · " : ""}{timeAgo(date)}
    </time>
  );
}
