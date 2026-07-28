"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import { isAdminUser } from "@/lib/auth";
import { formatXp } from "@/lib/progression";

interface ProgressionAdminData {
  summary: {
    members: number;
    xp_issued: number;
    qualified: number;
    revoked_events: number;
  };
  season: {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    ends_at: string;
  } | null;
  rules: XpRule[];
  members: ProgressionMember[];
}

interface XpRule {
  event_type: string;
  actor_xp: number;
  recipient_xp: number;
  daily_limit: number | null;
  enabled: boolean;
}

interface ProgressionMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  lifetime_xp: number;
  level: number;
  season_xp: number;
  is_disqualified: boolean;
  revoked_events: number;
}

const ruleLabels: Record<string, string> = {
  post_created: "Brick publicado",
  comment_created: "Comentário publicado",
  comment_received: "Comentário recebido",
  reaction_given: "Reação enviada",
  reaction_received: "Reação recebida",
  comment_like_received: "Curtida recebida",
  poll_voted: "Voto em enquete",
  post_shared: "Compartilhamento",
  editorial_highlight: "Destaque editorial",
  weekly_active_3: "Atividade em três dias",
  weekly_active_5: "Atividade em cinco dias",
  admin_adjustment: "Ajuste administrativo",
};

export default function ProgressionAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createDataClient(), []);
  const [data, setData] = useState<ProgressionAdminData | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<ProgressionMember | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");

  const loadData = useCallback(async (search = "") => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminUser(user)) {
      router.replace("/admin/login");
      return;
    }

    const { data: overview, error: overviewError } = await supabase.rpc("admin_progression_overview", {
      target_query: search,
    });
    if (overviewError) {
      setError("A auditoria de progressão ainda não está disponível neste ambiente.");
    } else {
      setData(overview as ProgressionAdminData);
      setError("");
    }
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  async function applySearch(event: React.FormEvent) {
    event.preventDefault();
    await loadData(query.trim());
  }

  async function saveRule(rule: XpRule) {
    setMessage("");
    setError("");
    const { error: updateError } = await supabase.rpc("admin_update_xp_rule", {
      target_event_type: rule.event_type,
      target_actor_xp: rule.actor_xp,
      target_recipient_xp: rule.recipient_xp,
      target_daily_limit: rule.daily_limit,
      target_enabled: rule.enabled,
    });
    if (updateError) setError("A regra não pôde ser atualizada.");
    else setMessage(`Regra “${ruleLabels[rule.event_type] || rule.event_type}” atualizada.`);
  }

  async function applyAdjustment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedMember) return;
    const amount = Number(adjustment);
    const { error: adjustmentError } = await supabase.rpc("admin_adjust_xp", {
      target_user_id: selectedMember.user_id,
      target_amount: amount,
      target_reason: reason,
    });
    if (adjustmentError) {
      setError(adjustmentError.message);
      return;
    }
    setSelectedMember(null);
    setAdjustment("");
    setReason("");
    setMessage(`Ajuste registrado para ${selectedMember.display_name}.`);
    await loadData(query);
  }

  async function toggleDisqualification(member: ProgressionMember) {
    const { error: updateError } = await supabase.rpc("admin_set_season_disqualification", {
      target_user_id: member.user_id,
      target_disqualified: !member.is_disqualified,
    });
    if (updateError) {
      setError("A situação na temporada não pôde ser alterada.");
      return;
    }
    setMessage(member.is_disqualified ? "Usuário reintegrado ao ranking." : "Usuário retirado do ranking.");
    await loadData(query);
  }

  const updateRule = (eventType: string, changes: Partial<XpRule>) => {
    setData((current) => current ? {
      ...current,
      rules: current.rules.map((rule) => rule.event_type === eventType ? { ...rule, ...changes } : rule),
    } : current);
  };

  return (
    <AdminShell
      active="progression"
      title="Progressão"
      description="Audite XP, ajuste regras e controle a temporada sem editar saldos diretamente."
      wide
      status={data?.season ? <span className="text-xs font-bold text-amber-300">{data.season.name} · {data.season.status}</span> : undefined}
    >
      {error && <p role="alert" className="mb-5 border-y border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mb-5 border-y border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">{message}</p>}

      {isLoading || !data ? (
        <p className="py-16 text-center text-sm text-gray-400">Carregando auditoria…</p>
      ) : (
        <div className="space-y-8">
          <section aria-label="Resumo da progressão" className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <Summary label="Membros" value={data.summary.members} />
            <Summary label="XP válido emitido" value={data.summary.xp_issued} />
            <Summary label="Classificados" value={data.summary.qualified} />
            <Summary label="Eventos revogados" value={data.summary.revoked_events} />
          </section>

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
            <section>
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-heading text-xl font-bold">Membros</h2>
                  <p className="mt-1 text-xs text-gray-500">Até 100 resultados por consulta.</p>
                </div>
                <form onSubmit={applySearch} className="flex gap-2">
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou usuário" className="min-h-11 border border-white/10 bg-background-void px-3 text-sm outline-none focus:border-brand-orange/60" />
                  <button className="min-h-11 bg-brand-orange px-4 text-xs font-bold">Buscar</button>
                </form>
              </div>
              <div className="divide-y divide-white/10">
                {data.members.map((member) => (
                  <article key={member.user_id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-center">
                    <div className="min-w-0">
                      <Link href={`/profile/${member.username}`} target="_blank" className="truncate text-sm font-bold hover:text-brand-orange">{member.display_name}</Link>
                      <p className="mt-1 text-[11px] text-gray-500">@{member.username} · {member.revoked_events} revogações</p>
                    </div>
                    <p className="text-xs text-gray-300">Nível <strong className="text-white">{member.level}</strong><br />{formatXp(member.lifetime_xp)} XP</p>
                    <p className="text-xs text-gray-300">Temporada<br /><strong className="text-white">{formatXp(member.season_xp)} XP</strong></p>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => setSelectedMember(member)} className="min-h-11 border border-white/15 px-3 text-xs font-bold hover:border-brand-orange/50">Ajustar</button>
                      <button type="button" onClick={() => void toggleDisqualification(member)} className={`min-h-11 px-3 text-xs font-bold ${member.is_disqualified ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/10 text-red-200"}`}>
                        {member.is_disqualified ? "Reintegrar" : "Retirar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="border-b border-white/10 pb-4 font-heading text-xl font-bold">Regras de XP</h2>
              <div className="divide-y divide-white/10">
                {data.rules.filter((rule) => rule.event_type !== "admin_adjustment").map((rule) => (
                  <div key={rule.event_type} className="py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <strong className="text-sm">{ruleLabels[rule.event_type] || rule.event_type}</strong>
                      <label className="flex items-center gap-2 text-[11px] text-gray-400">
                        Ativa
                        <input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(rule.event_type, { enabled: event.target.checked })} className="h-4 w-4 accent-[#ff5e00]" />
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <RuleField label="Autor" value={rule.actor_xp} onChange={(value) => updateRule(rule.event_type, { actor_xp: value })} />
                      <RuleField label="Recebe" value={rule.recipient_xp} onChange={(value) => updateRule(rule.event_type, { recipient_xp: value })} />
                      <RuleField label="Limite" value={rule.daily_limit ?? 0} onChange={(value) => updateRule(rule.event_type, { daily_limit: value || null })} />
                    </div>
                    <button type="button" onClick={() => void saveRule(rule)} className="mt-3 min-h-11 text-xs font-bold text-brand-orange hover:text-white">Salvar regra</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedMember(null)}>
          <form role="dialog" aria-modal="true" aria-labelledby="xp-dialog-title" onSubmit={applyAdjustment} className="w-full max-w-md bg-[#15161d] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <h2 id="xp-dialog-title" className="font-heading text-xl font-bold">Ajustar XP</h2>
            <p className="mt-1 text-sm text-gray-400">{selectedMember.display_name} · saldo atual de {formatXp(selectedMember.lifetime_xp)} XP</p>
            <label className="mt-6 block">
              <span className="text-xs font-bold text-gray-300">Quantidade</span>
              <input type="number" min={-10000} max={10000} value={adjustment} onChange={(event) => setAdjustment(event.target.value)} required className="mt-2 w-full border border-white/10 bg-background-void px-3 text-sm outline-none focus:border-brand-orange/60" />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-bold text-gray-300">Justificativa</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={300} rows={4} required className="mt-2 w-full resize-none border border-white/10 bg-background-void p-3 text-sm outline-none focus:border-brand-orange/60" />
            </label>
            <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setSelectedMember(null)} className="min-h-11 px-4 text-xs font-bold text-gray-400 hover:text-white">Cancelar</button>
              <button className="min-h-11 bg-brand-orange px-5 text-xs font-bold">Registrar ajuste</button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="p-5"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 font-heading text-3xl font-black">{formatXp(value)}</p></div>;
}

function RuleField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] text-gray-500">{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full border border-white/10 bg-background-void px-2 text-sm outline-none focus:border-brand-orange/60" />
    </label>
  );
}
