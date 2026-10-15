"use client";

import Link from "next/link";

export interface GradientButtonGroupItem {
  href: string;
  label: string;
  iconActive: string;
  iconInactive: string;
  active: boolean;
  featured?: boolean;
}

interface GradientButtonGroupProps {
  items: GradientButtonGroupItem[];
  ariaLabel: string;
}

export function GradientButtonGroup({ items, ariaLabel }: GradientButtonGroupProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="relative mx-auto max-w-lg rounded-[28px] border border-white/10 bg-[#090a0f]/95 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl"
    >
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item, idx) => {
          const isNotLast = idx < items.length - 1;
          return (
            <div key={item.href} className="relative flex items-center">
              <Link
                href={item.href}
                aria-label={item.label === "Lançamentos" ? "Agenda de lançamentos" : item.label}
                aria-current={item.active ? "page" : undefined}
                className="group relative flex min-h-16 w-full flex-col items-center justify-start gap-1 px-0.5 pb-1 pt-2 text-center transition-colors select-none"
              >
                {item.active && !item.featured && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 h-1 w-6 rounded-full bg-brand-orange shadow-[0_2px_8px_rgba(255,94,0,0.6)] animate-fade-in"
                  />
                )}

                <div className={item.featured ? `relative -mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange shadow-[0_4px_18px_rgba(255,94,0,0.3)] transition-transform group-hover:scale-105 group-active:scale-95 ${item.active ? "ring-2 ring-brand-orange/50 ring-offset-2 ring-offset-[#090a0f]" : ""}` : "relative flex h-6 w-6 items-center justify-center"}>
                  <img
                    src={item.active || item.featured ? item.iconActive : item.iconInactive}
                    alt=""
                    className={`${item.featured ? "h-7 w-7 brightness-0" : "h-5 w-5"} object-contain transition-transform duration-200 ${
                      item.featured ? "" : item.active ? "scale-105" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                    }`}
                  />
                </div>

                <span
                  className={`flex min-h-8 max-w-full items-center justify-center text-xs leading-4 transition-colors ${
                    item.active || item.featured
                      ? "font-bold text-brand-orange"
                      : "font-medium text-gray-400 group-hover:text-white"
                  }`}
                >
                  {item.label === "Lançamentos" ? "Agenda" : item.label === "BrickBoard" ? <span aria-hidden="true">Brick<br />Board</span> : item.label}
                </span>
              </Link>

              {isNotLast && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 h-8 w-px bg-white/[0.08] pointer-events-none"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
