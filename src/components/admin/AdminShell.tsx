"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminSection = "overview" | "editor" | "images" | "releases";

interface AdminShellProps {
  active: AdminSection;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  status?: ReactNode;
  wide?: boolean;
}

function OverviewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  );
}

function ImagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3.5" />
    </svg>
  );
}

function ReleasesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
      <path d="M8 13h3v3H8z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M14 5h5v5M19 5l-9 9" />
      <path d="M18 13v6H5V6h6" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

export function AdminShell({
  active,
  title,
  description,
  children,
  actions,
  status,
  wide = false,
}: AdminShellProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const navClass = (section: AdminSection) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange ${
      active === section
        ? "bg-brand-orange text-white"
        : "text-gray-400 hover:bg-white/[0.05] hover:text-white"
    }`;

  return (
    <div className="min-h-dvh bg-background-void text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-[#111218] lg:flex">
        <div className="flex min-h-20 items-center gap-3 border-b border-white/[0.07] px-6">
          <img
            src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
            alt=""
            style={{ maxHeight: "36px", maxWidth: "48px", width: "auto", height: "auto" }}
            className="h-9 w-auto max-w-12 object-contain"
          />
          <div>
            <p className="font-heading text-lg font-black uppercase leading-none">
              Orange<span className="text-brand-orange">_</span>Brick
            </p>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">Redação</p>
          </div>
        </div>

        <nav aria-label="Navegação administrativa" className="flex-1 space-y-1 p-4">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
            Operação editorial
          </p>
          <Link href="/admin" className={navClass("overview")} aria-current={active === "overview" ? "page" : undefined}>
            <OverviewIcon />
            Visão geral
          </Link>
          <Link href="/admin/edit" className={navClass("editor")} aria-current={active === "editor" ? "page" : undefined}>
            <ComposeIcon />
            Nova matéria
          </Link>
          <Link href="/admin/images" className={navClass("images")} aria-current={active === "images" ? "page" : undefined}>
            <ImagesIcon />
            Biblioteca de imagens
          </Link>
          <Link href="/admin/releases" className={navClass("releases")} aria-current={active === "releases" ? "page" : undefined}>
            <ReleasesIcon />
            Radar de lançamentos
          </Link>
        </nav>

        <div className="space-y-1 border-t border-white/[0.07] p-4">
          <Link
            href="/"
            target="_blank"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
          >
            <ExternalIcon />
            Abrir site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-300/75 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-400"
          >
            <ExitIcon />
            Encerrar sessão
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-background-void/95 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-6 lg:hidden">
            <Link href="/admin" className="flex min-h-11 min-w-11 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-brand-orange">
              <img
                src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
                alt="Orange Brick"
                style={{ maxHeight: "32px", maxWidth: "44px", width: "auto", height: "auto" }}
                className="h-8 w-auto max-w-11 object-contain"
              />
              <span className="hidden font-heading text-sm font-black uppercase xs:inline">
                Orange<span className="text-brand-orange">_</span>Brick
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/"
                target="_blank"
                aria-label="Abrir site público"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-2 focus-visible:outline-brand-orange"
              >
                <ExternalIcon />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Encerrar sessão"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-red-300/75 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-red-400"
              >
                <ExitIcon />
              </button>
            </div>
          </div>

          <nav aria-label="Atalhos administrativos" className="flex gap-1 overflow-x-auto border-t border-white/[0.06] px-3 py-2 lg:hidden">
            <Link
              href="/admin"
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${
                active === "overview" ? "bg-brand-orange text-white" : "text-gray-400"
              }`}
            >
              <OverviewIcon />
              Visão geral
            </Link>
            <Link
              href="/admin/edit"
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${
                active === "editor" && pathname === "/admin/edit" ? "bg-brand-orange text-white" : "text-gray-400"
              }`}
            >
              <ComposeIcon />
              Nova matéria
            </Link>
            <Link
              href="/admin/images"
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${
                active === "images" ? "bg-brand-orange text-white" : "text-gray-400"
              }`}
            >
              <ImagesIcon />
              Imagens
            </Link>
            <Link
              href="/admin/releases"
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${
                active === "releases" ? "bg-brand-orange text-white" : "text-gray-400"
              }`}
            >
              <ReleasesIcon />
              Radar
            </Link>
          </nav>
        </header>

        <main className={`${wide ? "max-w-[1520px]" : "max-w-7xl"} mx-auto w-full px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 [&_input]:min-h-11 [&_select]:min-h-11`}>
          <div className="mb-7 flex flex-col gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-brand-orange">Painel administrativo</span>
                {status}
              </div>
              <h1 className="text-balance font-heading text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{description}</p>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
