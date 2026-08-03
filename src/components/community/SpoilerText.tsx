"use client";

import { useState } from "react";

export function SpoilerText({ children }: { children: string }) {
  const [revealed, setRevealed] = useState<string[]>([]);
  const parts = children.split(/(\|\|[^|]+\|\|)/g);
  return <>{parts.map((part, index) => {
    const spoiler = part.startsWith("||") && part.endsWith("||");
    if (!spoiler) return part;
    const key = `${index}-${part}`;
    const visible = revealed.includes(key);
    return <button key={key} type="button" aria-label={visible ? "Ocultar spoiler" : "Revelar spoiler"} onClick={() => setRevealed((current) => visible ? current.filter((item) => item !== key) : [...current, key])} className={`mx-1 inline rounded px-1.5 text-left transition-colors ${visible ? "bg-white/10 text-white" : "bg-white text-transparent hover:bg-brand-orange"}`}>{part.slice(2, -2)}</button>;
  })}</>;
}
