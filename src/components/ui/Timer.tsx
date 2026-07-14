"use client";

import { useState, useEffect } from "react";
import { timeAgo } from "@/lib/utils/time-ago";

interface TimerProps {
  date: string;
}

export function Timer({ date }: TimerProps) {
  const [label, setLabel] = useState(() => timeAgo(date));

  useEffect(() => {
    setLabel(timeAgo(date));

    const interval = setInterval(() => {
      setLabel(timeAgo(date));
    }, 60_000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className="text-[11px] font-mono text-brand-orange-muted">
      {label}
    </span>
  );
}
