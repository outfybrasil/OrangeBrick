import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main id="conteudo-principal" tabIndex={-1} className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Icon name="brick" size={48} className="text-brand-orange-muted opacity-40" />
      <h1 className="text-lg font-mono font-bold text-white">
        404 — Tijolo não encontrado
      </h1>
      <p className="text-sm text-gray-400 font-sans max-w-md">
        Essa página não existe ou foi quebrada em pedaços.
      </p>
      <Link
        href="/"
        className="px-6 py-2 text-sm font-mono text-brand-orange border border-brand-orange/40 hover:bg-brand-orange/10 transition-colors rounded-none mt-2"
      >
        Voltar ao feed
      </Link>
    </main>
  );
}
