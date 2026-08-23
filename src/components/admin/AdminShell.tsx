"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

type AdminSection = "overview" | "editor" | "images" | "releases" | "community" | "progression" | "team" | "settings" | "health";

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
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 4h6v6H4zM14 4h6v10h-6zM4 14h6v6H4zM14 18h6v2h-6z" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  );
}

function ImagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m5.5 17 4.5-4 3 2.5 2.5-2 3 3.5" />
    </svg>
  );
}

function ReleasesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
      <path d="M8 13h3v3H8z" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 6h14v9H9l-4 3z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  );
}

function ProgressionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 19V9M12 19V5M19 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M14 5h5v5M19 5l-9 9" />
      <path d="M18 13v6H5V6h6" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const drawerRef = useModalDialog<HTMLElement>(mobileMenuOpen, () => setMobileMenuOpen(false));

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
    <div className="admin-root min-h-dvh bg-[#0a0b0e] text-white selection:bg-brand-orange selection:text-white">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-[#0e0f14] xl:flex">
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
            <p className="text-xs text-gray-500 font-semibold">Redação</p>
          </div>
        </div>

        {/* NAV ITEMS */}
        <nav aria-label="Navegação administrativa" className="flex-1 space-y-5 p-3.5 overflow-y-auto">
          <div>
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
              Operação Editorial
            </p>
            <div className="space-y-1">
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
              <Link href="/admin/community" className={navClass("community")} aria-current={active === "community" ? "page" : undefined}>
                <CommunityIcon />
                Comunidade
              </Link>
              <Link href="/admin/progression" className={navClass("progression")} aria-current={active === "progression" ? "page" : undefined}>
                <ProgressionIcon />
                Progressão
              </Link>
              <Link href="/admin/health" className={navClass("health")} aria-current={active === "health" ? "page" : undefined}>
                <OverviewIcon />
                Saúde e auditoria
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
              Administração
            </p>
            <div className="space-y-1">
              <Link href="/admin/team" className={navClass("team")} aria-current={active === "team" ? "page" : undefined}>
                <CommunityIcon />
                Equipe
              </Link>
              <Link href="/admin/settings" className={navClass("settings")} aria-current={active === "settings" ? "page" : undefined}>
                <OverviewIcon />
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
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
                OB
              </div>
              <span className="truncate text-xs font-bold text-gray-200">Orange Brick</span>
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
      <div className="xl:pl-60">
        {/* HEADER TOP STATUS BAR (DESKTOP & MOBILE) */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b0e]/95 backdrop-blur-xl">
          <div className="flex min-h-14 items-center justify-between gap-3 px-3.5 sm:px-6 lg:px-8">
            {/* MOBILE LOGO & TOGGLE */}
            <div className="flex items-center gap-2.5 xl:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gray-300 transition-colors hover:text-white active:scale-95"
                aria-label="Abrir menu administrativo"
                aria-expanded={mobileMenuOpen}
                aria-controls="admin-mobile-drawer"
                aria-haspopup="dialog"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <Link href="/admin" className="flex items-center gap-2">
                <img
                  src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
                  alt=""
                  style={{ maxHeight: "22px", maxWidth: "28px", width: "auto", height: "auto" }}
                  className="h-6 w-auto object-contain"
                />
                <span className="font-heading text-xs font-black uppercase tracking-wider text-white">
                  ADMIN<span className="text-brand-orange">_</span>OB
                </span>
              </Link>
            </div>

            {/* DESKTOP STATUS & DATE */}
            <div className="hidden xl:flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Redação sincronizada
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400">{formattedDate}</span>
            </div>

            {/* BOTÃO DE AÇÃO NO TOPO */}
            <div className="flex items-center gap-2">
              {actions}
              <Link
                href="/"
                target="_blank"
                className="hidden sm:inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                title="Visualizar portal ao vivo"
              >
                <ExternalIcon />
                Site
              </Link>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL COM SAFE-AREA E PADDING PARA BOTTOM DOCK */}
        <main className={`${wide ? "max-w-[1600px]" : "max-w-7xl"} mx-auto w-full min-w-0 px-3.5 py-4 pb-28 xs:px-4 sm:px-6 sm:py-6 sm:pb-12 lg:px-8`}>
          {/* HEADER DA PÁGINA */}
          <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-orange">
                  PAINEL ADMINISTRATIVO
                </p>
                {status}
              </div>
              <h1 className="break-words font-heading text-xl font-black leading-tight text-white xs:text-2xl sm:text-3xl">
                {title}
              </h1>
              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-gray-400 sm:text-sm">{description}</p>
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <nav
        aria-label="Navegação rápida mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0b0e]/95 p-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-2xl xl:hidden"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all ${
              active === "overview"
                ? "bg-brand-orange/15 text-brand-orange"
                : "text-gray-400 hover:text-white active:scale-95"
            }`}
          >
            <OverviewIcon />
            <span>Início</span>
          </Link>

          <Link
            href="/admin/edit"
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all ${
              active === "editor"
                ? "bg-brand-orange/15 text-brand-orange"
                : "text-gray-400 hover:text-white active:scale-95"
            }`}
          >
            <ComposeIcon />
            <span>Escrever</span>
          </Link>

          <Link
            href="/admin/images"
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all ${
              active === "images"
                ? "bg-brand-orange/15 text-brand-orange"
                : "text-gray-400 hover:text-white active:scale-95"
            }`}
          >
            <ImagesIcon />
            <span>Mídias</span>
          </Link>

          <Link
            href="/admin/releases"
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition-all ${
              active === "releases"
                ? "bg-brand-orange/15 text-brand-orange"
                : "text-gray-400 hover:text-white active:scale-95"
            }`}
          >
            <ReleasesIcon />
            <span>Radar</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            aria-controls="admin-mobile-drawer"
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-bold text-gray-400 transition-all hover:text-white active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* MOBILE FULL DRAWER MODAL */}
      {mobileMenuOpen && (
        <div
          id="admin-mobile-drawer"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 xl:hidden"
          onMouseDown={(event) => event.target === event.currentTarget && setMobileMenuOpen(false)}
        >
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegação administrativa"
            className="flex h-full w-[min(20rem,86vw)] flex-col border-r border-white/10 bg-[#0e0f14] p-4 shadow-2xl animate-in slide-in-from-left duration-200 focus:outline-none"
            tabIndex={-1}
          >
            {/* DRAWER HEADER */}
            <div className="flex min-h-14 items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`}
                  alt=""
                  style={{ maxHeight: "26px", maxWidth: "34px", width: "auto", height: "auto" }}
                  className="h-6 w-auto object-contain"
                />
                <div>
                  <p className="font-heading text-xs font-black uppercase tracking-wider text-white">
                    ORANGE<span className="text-brand-orange">_</span>BRICK
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold">Painel Administrativo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="Fechar navegação"
              >
                ✕
              </button>
            </div>

            {/* DRAWER NAV LINKS */}
            <nav className="flex-1 space-y-4 overflow-y-auto py-4" onClick={() => setMobileMenuOpen(false)}>
              <div>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                  Operação Editorial
                </p>
                <div className="space-y-1">
                  <Link href="/admin" className={navClass("overview")} aria-current={active === "overview" ? "page" : undefined}><OverviewIcon />Visão geral</Link>
                  <Link href="/admin/edit" className={navClass("editor")} aria-current={active === "editor" ? "page" : undefined}><ComposeIcon />Nova matéria</Link>
                  <Link href="/admin/images" className={navClass("images")} aria-current={active === "images" ? "page" : undefined}><ImagesIcon />Biblioteca de imagens</Link>
                  <Link href="/admin/releases" className={navClass("releases")} aria-current={active === "releases" ? "page" : undefined}><ReleasesIcon />Radar de lançamentos</Link>
                  <Link href="/admin/community" className={navClass("community")} aria-current={active === "community" ? "page" : undefined}><CommunityIcon />Comunidade</Link>
                  <Link href="/admin/progression" className={navClass("progression")} aria-current={active === "progression" ? "page" : undefined}><ProgressionIcon />Progressão</Link>
                  <Link href="/admin/health" className={navClass("health")} aria-current={active === "health" ? "page" : undefined}><OverviewIcon />Saúde e auditoria</Link>
                </div>
              </div>

              <div>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                  Administração
                </p>
                <div className="space-y-1">
                  <Link href="/admin/team" className={navClass("team")}><CommunityIcon />Equipe</Link>
                  <Link href="/admin/settings" className={navClass("settings")}><OverviewIcon />Configurações</Link>
                </div>
              </div>
            </nav>

            {/* DRAWER FOOTER */}
            <div className="space-y-2 border-t border-white/10 pt-3 pb-[env(safe-area-inset-bottom)]">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-bold text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <ExternalIcon />
                Abrir portal público
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                <ExitIcon />
                Encerrar sessão
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
