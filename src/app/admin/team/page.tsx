"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export default function AdminTeamPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sua sessão expirou.");
      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a equipe.");
      setMembers(payload.members as TeamMember[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a equipe.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadMembers());
  }, [loadMembers]);

  return (
    <AdminShell active="team" title="Equipe" description="Administradores com acesso ao painel editorial.">
      {error && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => void loadMembers()} className="min-h-11 px-3 font-bold">Tentar novamente</button>
        </div>
      )}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white/[0.05]" aria-label="Carregando equipe" />
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-10 text-center text-sm text-gray-400">Nenhum administrador encontrado.</div>
      ) : (
        <section aria-label="Administradores" className="overflow-hidden rounded-xl border border-white/10">
          <div className="divide-y divide-white/10">
            {members.map((member) => (
              <article key={member.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">{member.name}</h2>
                  <p className="mt-1 truncate text-xs text-gray-400">{member.email}</p>
                </div>
                <div className="text-xs text-gray-400">
                  <p>Entrou em {new Intl.DateTimeFormat("pt-BR").format(new Date(member.createdAt))}</p>
                  <p className="mt-1">{member.lastSignInAt ? `Último acesso em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(member.lastSignInAt))}` : "Ainda não acessou"}</p>
                </div>
                <span className="w-fit border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Administrador</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  );
}
