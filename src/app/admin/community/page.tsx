"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPollRow, Topic } from "@/lib/types/database";

const todayStr = new Date().toISOString().slice(0, 10);

interface ReportItem {
  id: string;
  content_type: "post" | "comment";
  content_id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  content: {
    id: string;
    user_id: string;
    author_name: string;
    content: string;
    post_id?: string;
    created_at: string;
  } | null;
}

type ModerationAction = "dismiss" | "delete" | "suspend_7d" | "ban";

function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-6">
      {values.map((v, i) => (
        <span
          key={i}
          style={{ height: `${Math.max(15, (v / max) * 100)}%` }}
          className={`w-1 rounded-sm ${color}`}
        />
      ))}
    </div>
  );
}

export default function CommunityAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createDataClient(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [poll, setPoll] = useState<CommunityPollRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [moderationTab, setModerationTab] = useState<"pendentes" | "resolvidas" | "todas">("pendentes");
  const [searchReport, setSearchReport] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [currentPageTopics, setCurrentPageTopics] = useState(1);
  const [showNewPollModal, setShowNewPollModal] = useState(false);

  // Estados do formulário de nova pergunta
  const [questionInput, setQuestionInput] = useState("");
  const [optionsInput, setOptionsInput] = useState(["", "", ""]);
  const [pollDateInput, setPollDateInput] = useState(todayStr);
  const [isSavingPoll, setIsSavingPoll] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeModerationId, setActiveModerationId] = useState<string | null>(null);
  const [pendingModeration, setPendingModeration] = useState<{ report: ReportItem; action: ModerationAction } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAdminUser(user)) {
        router.push("/admin/login");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const [{ data: topicData, error: topicError }, { data: pollData, error: pollError }, reportResponse] = await Promise.all([
        supabase.from("topics").select("*").order("name", { ascending: true }),
        supabase
          .from("community_polls")
          .select("*")
          .eq("is_active", true)
          .order("prompt_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        fetch("/api/admin/community", {
          headers: { Authorization: `Bearer ${session?.access_token || ""}` },
          cache: "no-store",
        }),
      ]);
      if (topicError || pollError || !reportResponse.ok) throw topicError || pollError || new Error("Não foi possível carregar as denúncias.");
      const reportPayload = await reportResponse.json() as { reports?: ReportItem[] };

      setTopics((topicData || []) as Topic[]);
      setReports(reportPayload.reports || []);
      const loadedPoll = pollData as CommunityPollRow | null;
      if (loadedPoll) {
        setPoll(loadedPoll);
        setQuestionInput(loadedPoll.question);
        const opts = loadedPoll.options as Array<{ id: number; text: string }>;
        if (opts) setOptionsInput(opts.map(o => o.text));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a comunidade.");
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  useEffect(() => {
    if (!showNewPollModal && !pendingModeration) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowNewPollModal(false);
      setPendingModeration(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pendingModeration, showNewPollModal]);

  const handleSavePoll = async () => {
    if (!questionInput.trim() || optionsInput.filter(o => o.trim()).length < 2) return;
    try {
      setIsSavingPoll(true);
      const payload = {
        question: questionInput.trim(),
        options: optionsInput.filter(o => o.trim()).map((text, idx) => ({ id: idx, text, votes: 0 })),
        prompt_date: pollDateInput,
        expires_at: new Date(`${pollDateInput}T23:59:59-03:00`).toISOString(),
        is_active: true,
      };

      const { error: deactivateError } = await supabase
        .from("community_polls")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("prompt_date", pollDateInput);
      if (deactivateError) throw deactivateError;
      const { error: saveError } = await supabase
        .from("community_polls")
        .upsert([payload], { onConflict: "prompt_date" });
      if (saveError) throw saveError;
      setShowNewPollModal(false);
      void loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar a pergunta.");
    } finally {
      setIsSavingPoll(false);
    }
  };

  const handleModeration = async (reportId: string, action: ModerationAction) => {
    try {
      setActiveModerationId(reportId);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ reportId, action }),
      });
      if (!response.ok) throw new Error("Não foi possível concluir a moderação.");
      setPendingModeration(null);
      await loadData();
    } catch (moderationError) {
      setError(moderationError instanceof Error ? moderationError.message : "Não foi possível concluir a moderação.");
    } finally {
      setActiveModerationId(null);
    }
  };

  const filteredReports = useMemo(() => {
    const query = searchReport.trim().toLowerCase();
    return reports.filter((report) => {
      if (moderationTab === "pendentes" && report.status !== "pending") return false;
      if (moderationTab === "resolvidas" && report.status === "pending") return false;
      return !query
        || report.reason.toLowerCase().includes(query)
        || report.content_id.toLowerCase().includes(query)
        || report.content?.author_name.toLowerCase().includes(query)
        || report.content?.content.toLowerCase().includes(query);
    });
  }, [moderationTab, reports, searchReport]);

  const filteredTopics = useMemo(() => {
    const q = searchTopic.toLowerCase().trim();
    if (!q) return topics;
    return topics.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [topics, searchTopic]);

  const topicPageSize = 5;
  const totalTopicPages = Math.max(1, Math.ceil(filteredTopics.length / topicPageSize));
  const paginatedTopics = useMemo(() => {
    const start = (currentPageTopics - 1) * topicPageSize;
    return filteredTopics.slice(start, start + topicPageSize);
  }, [filteredTopics, currentPageTopics]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0b0e] text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange/25 border-t-brand-orange" />
          <p className="text-xs text-gray-400">Carregando painel da comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell
      active="community"
      title="Comunidade"
      description="Modere conversas, acompanhe a saúde da comunidade e organize os assuntos que conectam Radar, matérias e Brickboard."
      status={
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Dados reais
        </span>
      }
      actions={
        <div className="flex items-center gap-3">
          <Link
            href="/brickboard"
            target="_blank"
            className="text-xs font-bold text-brand-orange hover:text-white transition-colors"
          >
            Ver Brickboard
          </Link>
          <button
            type="button"
            onClick={() => setShowNewPollModal(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-orange px-4 text-xs font-bold text-white hover:bg-[#ff7526] transition-colors"
          >
            + Nova pergunta
          </button>
        </div>
      }
      wide
    >
      {error && (
        <div role="alert" className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-200">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="min-h-11 px-3 font-bold text-red-300 hover:text-white">Fechar</button>
        </div>
      )}
      {/* 4 CARDS DE KPIS NO TOPO */}
      <section aria-label="Estatísticas da Comunidade" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* CONVERSAS ATIVAS */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Conversas ativas</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">0</p>
            <p className="mt-1 text-[11px] text-gray-500">Sem dados calculados</p>
          </div>
          <MiniBarChart values={[0]} color="bg-emerald-500" />
        </div>

        {/* PARTICIPAÇÕES HOJE */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Participações hoje</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">0</p>
            <p className="mt-1 text-[11px] text-gray-500">Sem dados calculados</p>
          </div>
          <MiniBarChart values={[0]} color="bg-brand-orange" />
        </div>

        {/* DENÚNCIAS ABERTAS */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Denúncias abertas</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">{reports.length}</p>
            <p className="mt-1 text-[11px] text-gray-500">Nenhuma denúncia carregada</p>
          </div>
          <MiniBarChart values={[0]} color="bg-amber-400" />
        </div>

        {/* TAXA DE RESPOSTA */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0e0f14] p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Taxa de resposta</span>
            </div>
            <p className="mt-2 font-heading text-3xl font-black text-white">—</p>
            <p className="mt-1 text-[11px] text-gray-500">Métrica indisponível</p>
          </div>
          <MiniBarChart values={[0]} color="bg-emerald-500" />
        </div>
      </section>

      {/* CORPO PRINCIPAL (2 COLUNAS) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">

        {/* COLUNA ESQUERDA (MODERAÇÃO & GRÁFICOS) */}
        <div className="space-y-6">

          {/* FILA DE MODERAÇÃO */}
          <section aria-labelledby="moderation-queue-title" className="rounded-xl border border-white/10 bg-[#0e0f14]">
            <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 id="moderation-queue-title" className="font-heading text-base font-bold text-white">
                  Fila de moderação
                </h2>
                <span className="text-xs font-bold text-brand-orange">{reports.length} denúncias abertas</span>
              </div>
              <div className="flex items-center gap-1 border-b border-white/10 sm:border-b-0 pb-2 sm:pb-0">
                {(["pendentes", "resolvidas", "todas"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setModerationTab(t)}
                    className={`px-3 py-1 text-xs font-semibold capitalize transition-colors relative ${
                      moderationTab === t ? "text-white font-bold" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {t}
                    {moderationTab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-orange" />}
                  </button>
                ))}
              </div>
            </div>

            {/* FILTROS DE MODERAÇÃO */}
            <div className="p-4 border-b border-white/10 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={searchReport}
                  onChange={(e) => setSearchReport(e.target.value)}
                  placeholder="Buscar conversa ou usuário"
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white outline-none focus:border-brand-orange/40"
                />
              </div>
              <select className="h-9 rounded-lg border border-white/10 bg-[#0e0f14] px-3 text-xs text-gray-300 outline-none">
                <option>Todas as prioridades</option>
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </div>

            {/* TABELA DE DENÚNCIAS */}
            <p className="border-b border-white/10 px-4 py-2 text-[11px] text-gray-500 sm:hidden">Deslize para revisar os detalhes e as ações.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] uppercase font-bold text-gray-500 bg-white/[0.01]">
                  <tr>
                    <th className="py-3 px-4">Usuário / Conteúdo denunciado</th>
                    <th className="py-3 px-4">Motivo</th>
                    <th className="py-3 px-4">Denúncias</th>
                    <th className="py-3 px-4">Denunciado</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-500">
                        Nenhuma denúncia real foi carregada.
                      </td>
                    </tr>
                  ) : filteredReports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
                            {rep.content_type === "post" ? "P" : "C"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white">{rep.content?.author_name || (rep.content_type === "post" ? "Publicação removida" : "Comentário removido")}</p>
                            <p className="line-clamp-2 max-w-[36rem] break-words text-[11px] leading-5 text-gray-400">{rep.content?.content || rep.content_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-300 font-semibold">{rep.reason}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">1 denúncia</td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(rep.created_at))}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          rep.status === "pending"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/10 text-gray-400"
                        }`}>
                          {rep.status === "pending" ? "Pendente" : "Resolvida"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {rep.status === "pending" && (
                            <>
                              <button type="button" disabled={activeModerationId === rep.id} onClick={() => setPendingModeration({ report: rep, action: "dismiss" })} className="min-h-11 px-3 text-[11px] font-bold text-gray-400 hover:text-white disabled:opacity-40">Ignorar</button>
                              <button type="button" disabled={activeModerationId === rep.id} onClick={() => setPendingModeration({ report: rep, action: "delete" })} className="min-h-11 border border-red-500/30 px-3 text-[11px] font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Excluir</button>
                              <button type="button" disabled={activeModerationId === rep.id} onClick={() => setPendingModeration({ report: rep, action: "suspend_7d" })} className="min-h-11 border border-amber-500/30 px-3 text-[11px] font-bold text-amber-300 hover:bg-amber-500/10 disabled:opacity-40">Suspender</button>
                              <button type="button" disabled={activeModerationId === rep.id} onClick={() => setPendingModeration({ report: rep, action: "ban" })} className="min-h-11 border border-red-500/30 px-3 text-[11px] font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Banir</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </section>

          {/* DOIS CARDS LADO A LADO: ATIVIDADE & DESTQUES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ATIVIDADE NO BRICKBOARD */}
            <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-white">Atividade no Brickboard</h3>
                <p className="mt-1 text-xs text-gray-400">Nenhuma série histórica configurada.</p>
              </div>

              {/* GRÁFICO DE BARRAS DE ATIVIDADE */}
              <div className="mt-6 border-t border-white/10 pt-4 text-center text-xs text-gray-500">
                O histórico aparecerá quando a consulta de atividade estiver configurada.
              </div>
            </div>

            {/* CONVERSAS EM DESTAQUE */}
            <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-white mb-3">Conversas em destaque</h3>
                <div className="space-y-3">
                  <p className="py-6 text-center text-xs text-gray-500">Nenhuma conversa em destaque calculada.</p>
                </div>
              </div>
              <div className="mt-4 pt-2">
                <Link href="/brickboard" className="text-xs font-bold text-brand-orange hover:underline">
                  Ver todas as conversas em destaque →
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* COLUNA DIREITA (WIDGETS DE SAÚDE, POLL & ASSUNTOS) */}
        <aside className="space-y-4">

          {/* PERGUNTA DO DIA */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Pergunta do dia</h3>
              <span className="text-[10px] text-gray-500">{poll?.prompt_date ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${poll.prompt_date}T12:00:00`)) : "Sem pergunta ativa"}</span>
            </div>

            <p className="text-xs font-bold text-white leading-snug">
              {poll?.question || "Nenhuma pergunta publicada."}
            </p>

            <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-white/10 pb-2">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">Publicada</span>
              <span>Resultados disponíveis no Brickboard</span>
            </div>

            {/* OPÇÕES DA PERGUNTA COM PORCENTAGEM */}
            <div className="space-y-2 text-xs">
              {poll && Array.isArray(poll.options) ? poll.options.map((option, index) => {
                const value = typeof option === "object" && option !== null && "text" in option ? String(option.text) : `Opção ${index + 1}`;
                return <div key={index} className="rounded border border-white/10 bg-white/[0.02] p-2 text-[11px] text-gray-300">{value}</div>;
              }) : null}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowNewPollModal(true)}
                className="rounded border border-brand-orange px-3 py-1 text-xs font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
              >
                Editar pergunta
              </button>
              <Link href="/brickboard" className="text-xs text-gray-400 hover:text-white">Ver resultados</Link>
            </div>
          </div>

          {/* SAÚDE DA COMUNIDADE */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-sm font-bold text-white">Saúde da comunidade</h3>
              <span className="text-[10px] font-bold text-gray-500">Sem cálculo</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>Denúncias resolvidas em até 1h</span>
                  <span className="font-bold text-white">—</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>Conversas sem resposta</span>
                  <span className="font-bold text-white">—</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>Sentimento positivo</span>
                  <span className="font-bold text-white">—</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* ASSUNTOS ACOMPANHADOS */}
          <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-white">Assuntos acompanhados</h3>
                <span className="text-[10px] text-gray-500">{topics.length} assuntos</span>
              </div>
              <div className="flex items-center gap-1">
              </div>
            </div>

            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                placeholder="Buscar assunto"
                className="h-8 w-full rounded border border-white/10 bg-white/[0.03] pl-8 pr-2 text-xs text-white outline-none focus:border-brand-orange/40"
              />
            </div>

            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[9px] uppercase font-bold text-gray-500">
                <tr>
                  <th className="py-2 px-1">Assunto</th>
                  <th className="py-2 px-1">Fonte</th>
                  <th className="py-2 px-1">Conversas</th>
                  <th className="py-2 px-1">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {paginatedTopics.map((top) => (
                  <tr key={top.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-1 font-bold text-white truncate max-w-[100px]">{top.name}</td>
                    <td className="py-2 px-1 text-gray-400">Radar</td>
                    <td className="py-2 px-1 text-gray-300 font-semibold">—</td>
                    <td className="py-2 px-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2 text-[11px] text-gray-500">
              <Link href="/admin/releases" className="text-xs text-brand-orange font-semibold hover:underline">Ver todos →</Link>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPageTopics(p => Math.max(1, p - 1))} disabled={currentPageTopics === 1} className="min-h-11 min-w-11 border border-white/10 disabled:opacity-20">‹</button>
                <span className="text-white font-bold">{currentPageTopics}</span>
                <button onClick={() => setCurrentPageTopics(p => Math.min(totalTopicPages, p + 1))} disabled={currentPageTopics === totalTopicPages} className="min-h-11 min-w-11 border border-white/10 disabled:opacity-20">›</button>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* MODAL DE CRIAR/EDITAR PERGUNTA DO DIA */}
      {showNewPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowNewPollModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="poll-dialog-title" className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#0e0f14] p-4 text-white sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 id="poll-dialog-title" className="font-heading text-base font-bold">Pergunta do dia</h3>
              <button type="button" onClick={() => setShowNewPollModal(false)} className="min-h-11 min-w-11 text-gray-400 hover:text-white" aria-label="Fechar">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Data da Pergunta</label>
              <input
                type="date"
                value={pollDateInput}
                onChange={(e) => setPollDateInput(e.target.value)}
                className="h-9 w-full rounded border border-white/10 bg-background-void px-3 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Pergunta</label>
              <textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                rows={3}
                placeholder="Digite a pergunta editorial..."
                className="w-full rounded border border-white/10 bg-background-void p-3 text-xs text-white outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400">Opções de Resposta</label>
              {optionsInput.map((opt, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const copy = [...optionsInput];
                    copy[idx] = e.target.value;
                    setOptionsInput(copy);
                  }}
                  placeholder={`Opção ${idx + 1}...`}
                  className="h-9 w-full rounded border border-white/10 bg-background-void px-3 text-xs text-white outline-none"
                />
              ))}
              {optionsInput.length < 5 && (
                <button
                  type="button"
                  onClick={() => setOptionsInput([...optionsInput, ""])}
                  className="text-xs font-bold text-brand-orange hover:underline"
                >
                  + Adicionar opção
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowNewPollModal(false)}
                className="h-9 rounded px-4 text-xs font-bold text-gray-400 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePoll}
                disabled={isSavingPoll}
                className="h-9 rounded bg-brand-orange px-4 text-xs font-bold text-white hover:bg-[#ff7526] disabled:opacity-50"
              >
                {isSavingPoll ? "Salvando..." : "Salvar Pergunta"}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingModeration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setPendingModeration(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="moderation-dialog-title" aria-describedby="moderation-dialog-description" className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0e0f14] p-6 text-white">
            <h3 id="moderation-dialog-title" className="font-heading text-lg font-bold">Confirmar ação de moderação</h3>
            <p id="moderation-dialog-description" className="mt-2 text-sm leading-6 text-gray-300">
              {pendingModeration.action === "dismiss" && "A denúncia será encerrada sem alterar o conteúdo."}
              {pendingModeration.action === "delete" && "O conteúdo será excluído permanentemente."}
              {pendingModeration.action === "suspend_7d" && "O conteúdo será removido e o autor ficará suspenso por sete dias."}
              {pendingModeration.action === "ban" && "O conteúdo será removido e o autor ficará banido até uma restauração manual."}
            </p>
            <div className="mt-4 border border-white/10 bg-white/[0.03] p-4">
              <p className="font-bold text-white">{pendingModeration.report.content?.author_name || "Conteúdo indisponível"}</p>
              <p className="mt-1 max-h-32 overflow-y-auto break-words text-sm leading-6 text-gray-400">{pendingModeration.report.content?.content || pendingModeration.report.content_id}</p>
              <p className="mt-3 text-xs text-gray-500">Motivo: {pendingModeration.report.reason}</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingModeration(null)} className="min-h-11 px-4 text-sm font-bold text-gray-300 hover:text-white">Cancelar</button>
              <button
                type="button"
                autoFocus
                disabled={Boolean(activeModerationId)}
                onClick={() => void handleModeration(pendingModeration.report.id, pendingModeration.action)}
                className="min-h-11 bg-brand-orange px-4 text-sm font-bold text-white hover:bg-[#ff7526] disabled:opacity-50"
              >
                {activeModerationId ? "Processando..." : "Confirmar ação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
