"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export interface GradientButtonGroupItem {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}

interface GradientButtonGroupProps {
  items: GradientButtonGroupItem[];
  ariaLabel: string;
}

export function GradientButtonGroup({ items, ariaLabel }: GradientButtonGroupProps) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.active));

  return (
    <nav aria-label={ariaLabel} className="relative mx-auto max-w-lg rounded-2xl border border-white/10 bg-background-void/95 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 rounded-xl bg-brand-orange shadow-[0_4px_16px_rgba(255,94,0,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ width: `${100 / items.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
        />
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative z-10 flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-xs font-extrabold leading-tight transition-colors active:bg-white/10 ${
                item.active ? "text-black font-black" : "text-gray-400 hover:text-white"
              }`}
            >
              <span className={`grid size-6 place-items-center transition-transform duration-300 motion-reduce:transition-none ${item.active ? "-translate-y-0.5" : ""}`}>
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
