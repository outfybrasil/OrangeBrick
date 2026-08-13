"use client";

import { useEffect, useState } from "react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 560);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      className="fixed bottom-[calc(8.25rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-12 w-12 items-center justify-center border border-brand-orange/60 bg-[#15161b] text-brand-orange shadow-[0_10px_32px_rgba(0,0,0,0.4)] transition-colors hover:bg-brand-orange hover:text-white sm:bottom-20 sm:right-5"
    >
      <span aria-hidden="true" className="text-lg font-bold leading-none">↑</span>
    </button>
  );
}
