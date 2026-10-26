"use client";

import { useReducer, useEffect } from "react";
import { usePathname } from "next/navigation";
import { timeAgo } from "@/lib/utils/time-ago";
import { cn } from "@/lib/utils";

interface TimerProps {
  date?: string;
  publishedAt?: string | null;
  createdAt?: string;
  className?: string;
}

export function Timer({ date: legacyDate, publishedAt, createdAt, className }: TimerProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "pt";
  const date = publishedAt || legacyDate || createdAt || "";
  const parsedDate = new Date(date);
  const exactDate = Number.isNaN(parsedDate.getTime())
    ? ""
    : new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
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
    <time dateTime={date} className={cn("min-w-0 text-xs font-medium text-gray-300", className)}>
      {exactDate}{exactDate ? " · " : ""}{timeAgo(date, locale)}
    </time>
  );
}
