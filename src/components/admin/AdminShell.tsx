"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminSection = "overview" | "editor" | "images" | "releases" | "community" | "progression";

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

function CommunityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 6h14v9H9l-4 3z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

function ProgressionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 19V9M12 19V5M19 19v-7" />
      <path d="M3 19h18" />
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
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const navClass = (section: AdminSection) =>
    `flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-orange ${
      active === section
        ? "bg-white/[0.08] text-brand-orange font-bold border-l-2 border-brand-orange pl-2.5"
        : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
    }`;

  const todayDateStr = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const formattedDate = todayDateStr.charAt(0).toUpperCase() + todayDateStr.slice(1);

  return (
    <div className="min-h-dvh bg-[#0a0b0e] text-white">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-[#0e0f14] lg:flex">
        {/* LOGO */}
        <div className="flex min-h-16 items-center gap-3 border-b border-white/10 px-5">
          <img
            src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
            alt=""
            style={{ maxHeight: "28px", maxWidth: "36px", width: "auto", height: "auto" }}
            className="h-7 w-auto max-w-10 object-contain"
          />
          <div>
            <p className="font-heading text-sm font-black uppercase tracking-wider text-white">
              ORANGE<span className="text-brand-orange">_</span>BRICK
            </p>
            <p className="text-[10px] text-gray-500 font-semibold">Redação</p>
          </div>
        </div>

        {/* NAV ITEMS */}
        <nav aria-label="Navegação administrativa" className="flex-1 space-y-5 p-3.5 overflow-y-auto">
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
              Operação Editorial
            </p>
            <div className="space-y-1">
              <Link href="/admin" className={navClass("overview")}>
                <OverviewIcon />
                Visão geral
              </Link>
              <Link href="/admin/edit" className={navClass("editor")}>
                <ComposeIcon />
                Nova matéria
              </Link>
              <Link href="/admin/images" className={navClass("images")}>
                <ImagesIcon />
                Biblioteca de imagens
              </Link>
              <Link href="/admin/releases" className={navClass("releases")}>
                <ReleasesIcon />
                Radar de lançamentos
              </Link>
              <Link href="/admin/community" className={navClass("community")}>
                <CommunityIcon />
                Comunidade
              </Link>
              <Link href="/admin/progression" className={navClass("progression")}>
                <ProgressionIcon />
                Progressão
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
              Administração
            </p>
            <div className="space-y-1">
              <Link href="/admin/team" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Equipe
              </Link>
              <Link href="/admin/settings" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold text-gray-400 hover:bg-white/[0.04] hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configurações
              </Link>
            </div>
          </div>
        </nav>

        {/* RODAPÉ DA SIDEBAR */}
        <div className="border-t border-white/10 p-3 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex min-h-9 items-center gap-2 px-3 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ExternalIcon />
            Abrir site
          </Link>

          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
                OB
              </div>
              <span className="truncate text-xs font-bold text-gray-200">OrangeBrick</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors p-1"
              title="Encerrar sessão"
            >
              <ExitIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="lg:pl-60">
        {/* HEADER TOP STATUS BAR */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b0e]/95 backdrop-blur-xl">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Dados sincronizados agora
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">{formattedDate}</span>
            </div>

            {/* BOTÃO DA DIREITA */}
            {actions && <div className="hidden lg:block">{actions}</div>}
          </div>
        </header>

        <main className={`${wide ? "max-w-[1600px]" : "max-w-7xl"} mx-auto w-full px-4 py-6 sm:px-6 lg:px-8`}>
          {/* HEADER DA PÁGINA */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">PAINEL ADMINISTRATIVO</p>
                {status}
              </div>
              <h1 className="font-heading text-2xl font-black text-white sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-xs text-gray-400">{description}</p>
            </div>
            {/* BOTÃO MOBILE */}
            {actions && <div className="lg:hidden">{actions}</div>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
