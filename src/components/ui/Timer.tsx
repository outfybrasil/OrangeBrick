"use client";

import { useReducer, useEffect } from "react";
import { timeAgo } from "@/lib/utils/time-ago";

interface TimerProps {
  date: string;
}

export function Timer({ date }: TimerProps) {
  const [, refresh] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const interval = setInterval(refresh, 60_000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className="text-[11px] font-subtitle font-medium text-gray-400">
      {timeAgo(date)}
    </span>
  );
}
