"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPollRow, Topic } from "@/lib/types/database";
import { useModalDialog } from "@/lib/hooks/useModalDialog";

const today = new Date().toISOString().slice(0, 10);
interface CommunityReport {
  id: string;
  content_type: "post" | "comment";
  content_id: string;
  reason: string;
  created_at: string;
  post_id?: string;
}

interface AppErrorEvent {
  id: string;
  source: string;
  message: string;
  route: string | null;
  created_at: string;
}

type ModerationAction = "dismiss" | "delete" | "suspend_7d" | "ban";

const moderationActionCopy: Record<ModerationAction, { label: string; description: string; button: string }> = {
  dismiss: { label: "Descartar denúncia?", description: "O conteúdo continuará no ar e a denúncia será encerrada.", button: "Descartar" },
  delete: { label: "Remover conteúdo?", description: "O conteúdo denunciado será apagado permanentemente.", button: "Remover" },
  suspend_7d: { label: "Suspender por 7 dias?", description: "O conteúdo será removido e o autor não poderá publicar, comentar ou reagir por sete dias.", button: "Suspender" },
  ban: { label: "Bloquear participação?", description: "O conteúdo será removido e o autor ficará impedido de participar do Brickboard até a conta ser restaurada.", button: "Bloquear" },
};

export default function CommunityAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createDataClient(), []);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
  const [promptDate, setPromptDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [engagement, setEngagement] = useState<Record<string, number>>({});
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [appErrors, setAppErrors] = useState<AppErrorEvent[]>([]);
  const [moderationTarget, setModerationTarget] = useState<{ report: CommunityReport; action: ModerationAction } | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  const moderationDialogRef = useModalDialog<HTMLDivElement>(moderationTarget !== null, () => setModerationTarget(null));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminUser(user)) {
      router.push("/admin/login");
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: topicData }, { data: pollData }, { data: eventData }, { data: reportData }, { data: appErrorData }] = await Promise.all([
      supabase.from("topics").select("*").order("name", { ascending: true }),
      supabase
        .from("community_polls")
        .select("*")
        .eq("is_active", true)
        .order("prompt_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("home_engagement_events")
        .select("event_name")
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("community_reports")
        .select("id, content_type, content_id, reason, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("app_error_events")
        .select("id, source, message, route, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setTopics((topicData || []) as Topic[]);
    const poll = pollData as CommunityPollRow | null;
    if (poll) {
      setQuestion(poll.question);
      setPromptDate(poll.prompt_date || today);
      const savedOptions = poll.options as Array<{ id: number; text: string }>;
      setOptions(savedOptions.map((option) => option.text));
    }
    const eventCounts: Record<string, number> = {};
    for (const event of (eventData || []) as Array<{ event_name: string }>) {
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
    }
    setEngagement(eventCounts);
    const pendingReports = (reportData || []) as CommunityReport[];
    const commentIds = pendingReports.filter((report) => report.content_type === "comment").map((report) => report.content_id);
    const { data: reportedComments } = commentIds.length
      ? await supabase.from("community_comments").select("id, post_id").in("id", commentIds)
      : { data: [] };
    const commentPostMap = new Map(((reportedComments || []) as Array<{ id: string; post_id: string }>).map((comment) => [comment.id, comment.post_id]));
    setReports(pendingReports.map((report) => ({
      ...report,
      post_id: report.content_type === "post" ? report.content_id : commentPostMap.get(report.content_id),
    })));
    setAppErrors((appErrorData || []) as AppErrorEvent[]);
    setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

  const saveQuestion = async () => {
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (cleanQuestion.length < 10 || cleanOptions.length < 2) {
      setError("Escreva uma pergunta com pelo menos 10 caracteres e duas respostas.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    const { data: existing } = await supabase
      .from("community_polls")
      .select("id")
      .eq("prompt_date", promptDate)
      .maybeSingle();
    const payload = {
      question: cleanQuestion,
      options: cleanOptions.map((text, index) => ({ id: index, text })),
      prompt_date: promptDate,
      expires_at: new Date(`${promptDate}T23:59:59-03:00`).toISOString(),
      is_active: true,
    };

    const existingPoll = existing as { id: string } | null;
    const { error: saveError } = existingPoll
      ? await supabase.from("community_polls").update(payload).eq("id", existingPoll.id)
      : await supabase.from("community_polls").insert(payload);

    if (saveError) {
      setError("A pergunta não foi salva. Verifique a data e tente novamente.");
    } else {
      setMessage("Pergunta editorial salva.");
    }
    setIsSaving(false);
  };

  const toggleTopic = async (topic: Topic) => {
    const nextActive = !topic.is_active;
    setTopics((current) => current.map((item) => item.id === topic.id ? { ...item, is_active: nextActive } : item));
    const { error: updateError } = await supabase
      .from("topics")
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq("id", topic.id);
    if (updateError) {
      setTopics((current) => current.map((item) => item.id === topic.id ? topic : item));
      setError("O assunto não pôde ser atualizado.");
    }
  };

  const reviewReport = async () => {
    if (!moderationTarget) return;
    setIsModerating(true);
    setError("");
    const { error: reviewError } = await supabase.rpc("admin_resolve_community_report", {
      target_report_id: moderationTarget.report.id,
      target_action: moderationTarget.action,
    });
    if (reviewError) {
      setError("A denúncia não pôde ser resolvida. Recarregue a página e tente novamente.");
      setIsModerating(false);
      return;
    }
    setReports((current) => current.filter((report) => report.id !== moderationTarget.report.id));
    setMessage("Ação de moderação registrada.");
    setModerationTarget(null);
    setIsModerating(false);
  };

  return (
    <AdminShell
      active="community"
      title="Comunidade"
      description="Defina a pergunta editorial e controle os assuntos que conectam Radar, matérias e Brickboard."
      wide
    >
      {isLoading ? (
        <div className="py-16 text-center text-sm text-gray-400">Carregando comunidade...</div>
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="reports-title" className="rounded-2xl bg-[#15161d]">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <h2 id="reports-title" className="font-heading text-xl font-black">Denúncias pendentes</h2>
              <p className="mt-1 text-sm text-gray-400">{reports.length ? `${reports.length} itens aguardando análise.` : "Nenhuma denúncia pendente."}</p>
            </div>
            {reports.length > 0 && (
              <div className="divide-y divide-white/[0.07]">
                {reports.map((report) => (
                  <article key={report.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <p className="text-sm font-bold text-white">{report.content_type === "post" ? "Brick denunciado" : "Comentário denunciado"}</p>
                      <p className="mt-1 text-xs text-gray-400">{report.reason} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(report.created_at))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/brickboard?post=${report.post_id || report.content_id}`} className="inline-flex min-h-11 items-center px-3 text-xs font-bold text-brand-orange hover:text-white">Abrir conteúdo</Link>
                      <button type="button" onClick={() => setModerationTarget({ report, action: "dismiss" })} className="min-h-11 px-3 text-xs font-bold text-gray-300 hover:text-white">Descartar</button>
                      <button type="button" onClick={() => setModerationTarget({ report, action: "delete" })} className="min-h-11 rounded-xl border border-red-400/30 px-3 text-xs font-bold text-red-200 hover:bg-red-500/10">Remover</button>
                      <button type="button" onClick={() => setModerationTarget({ report, action: "suspend_7d" })} className="min-h-11 rounded-xl bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-500">Suspender 7 dias</button>
                      <button type="button" onClick={() => setModerationTarget({ report, action: "ban" })} className="min-h-11 rounded-xl bg-red-700 px-3 text-xs font-bold text-white hover:bg-red-600">Bloquear</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="errors-title" className="rounded-2xl bg-[#15161d]">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <h2 id="errors-title" className="font-heading text-xl font-black">Falhas recentes</h2>
              <p className="mt-1 text-sm text-gray-400">{appErrors.length ? "Erros inesperados registrados pelo site." : "Nenhuma falha inesperada registrada."}</p>
            </div>
            {appErrors.length > 0 && (
              <div className="divide-y divide-white/[0.07]">
                {appErrors.map((item) => (
                  <article key={item.id} className="p-4 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-white">{item.source}</p>
                      <time className="text-xs text-gray-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time>
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-gray-400">{item.message}</p>
                    {item.route && <p className="mt-1 text-[11px] text-brand-orange">{item.route}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="engagement-title" className="rounded-2xl bg-[#15161d] p-5 sm:p-6">
            <div>
              <h2 id="engagement-title" className="font-heading text-xl font-black">Cliques da Home</h2>
              <p className="mt-1 text-sm text-gray-400">Últimos sete dias, somente após consentimento.</p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 lg:grid-cols-4">
              {[
                ["article", "Matérias"],
                ["brickboard", "Brickboard"],
                ["radar", "Radar"],
                ["return_summary", "Retorno"],
              ].map(([key, label]) => (
                <div key={key} className="bg-background-void p-4">
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="mt-1 text-2xl font-black text-white">{engagement[key] || 0}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl bg-[#15161d] p-5 sm:p-6">
            <h2 className="font-heading text-xl font-black">Pergunta editorial</h2>
            <p className="mt-1 text-sm text-gray-400">Uma pergunta por dia, com respostas curtas e diretas.</p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-gray-300">Data</span>
                <input
                  type="date"
                  value={promptDate}
                  onChange={(event) => setPromptDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-300">Pergunta</span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={180}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-background-void p-3 text-sm text-white outline-none focus:border-brand-orange/60"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300">Respostas</span>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      value={option}
                      onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      maxLength={90}
                      aria-label={`Resposta ${index + 1}`}
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/60"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="min-h-11 rounded-xl px-3 text-xs font-bold text-red-300 hover:bg-red-500/10"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOptions((current) => [...current, ""])}
                    className="min-h-11 text-xs font-bold text-brand-orange hover:text-white"
                  >
                    Adicionar resposta
                  </button>
                )}
              </div>

              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
              <button
                type="button"
                onClick={saveQuestion}
                disabled={isSaving}
                className="min-h-11 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : "Salvar pergunta"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-[#15161d]">
            <div className="border-b border-white/10 p-5 sm:p-6">
              <h2 className="font-heading text-xl font-black">Assuntos</h2>
              <p className="mt-1 text-sm text-gray-400">{topics.length} assuntos importados do Radar.</p>
            </div>
            <div className="max-h-[680px] divide-y divide-white/[0.07] overflow-y-auto">
              {topics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between gap-4 p-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{topic.name}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{topic.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={topic.is_active}
                    className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold ${
                      topic.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.05] text-white/60"
                    }`}
                  >
                    {topic.is_active ? "Ativo" : "Oculto"}
                  </button>
                </div>
              ))}
            </div>
          </section>
          </div>
        </div>
      )}
      {moderationTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background-void/90 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isModerating) setModerationTarget(null);
        }}>
          <div ref={moderationDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="moderation-dialog-title" tabIndex={-1} className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#191b21] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <h2 id="moderation-dialog-title" className="text-xl font-black text-white">{moderationActionCopy[moderationTarget.action].label}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">{moderationActionCopy[moderationTarget.action].description}</p>
            <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-gray-400">Motivo informado: {moderationTarget.report.reason}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModerationTarget(null)} disabled={isModerating} className="min-h-11 rounded-xl px-4 text-sm font-bold text-gray-300 hover:bg-white/5 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={() => void reviewReport()} disabled={isModerating} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
                {isModerating ? "Aplicando…" : moderationActionCopy[moderationTarget.action].button}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
