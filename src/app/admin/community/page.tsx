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
  user_name: string;
  avatar_url?: string;
  content: string;
  reason: string;
  reports_count: number;
  time_ago: string;
  priority: "Alta" | "Média" | "Baixa";
}

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

  // Mock de denúncias
  const [reports] = useState<ReportItem[]>([
    {
      id: "1",
      user_name: "NeoWolf",
      content: '"Playstation é lixo, quem joga isso tem que se matar mesmo kkk"',
      reason: "Ataque pessoal",
      reports_count: 3,
      time_ago: "há 12 min",
      priority: "Alta",
    },
    {
      id: "2",
      user_name: "PixelViking",
      content: '"Confira aqui meu site com gift cards baratos!!! bit.ly/xyz123"',
      reason: "Spam",
      reports_count: 2,
      time_ago: "há 38 min",
      priority: "Média",
    },
    {
      id: "3",
      user_name: "LaraCroftBR",
      content: '"A cena final mostra que o vilão estava vivo o tempo todo.."',
      reason: "Spoiler",
      reports_count: 1,
      time_ago: "há 1 h",
      priority: "Baixa",
    },
  ]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!isAdminUser(user)) {
        router.push("/admin/login");
        return;
      }

      const [{ data: topicData }, { data: pollData }] = await Promise.all([
        supabase.from("topics").select("*").order("name", { ascending: true }),
        supabase
          .from("community_polls")
          .select("*")
          .eq("is_active", true)
          .order("prompt_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setTopics((topicData || []) as Topic[]);
      const loadedPoll = pollData as CommunityPollRow | null;
      if (loadedPoll) {
        setPoll(loadedPoll);
        setQuestionInput(loadedPoll.question);
        const opts = loadedPoll.options as Array<{ id: number; text: string }>;
        if (opts) setOptionsInput(opts.map(o => o.text));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, [loadData]);

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

      const { error } = await supabase.from("community_polls").insert([payload]);
      if (!error) {
        setShowNewPollModal(false);
        void loadData();
      }
    } catch {
    } finally {
      setIsSavingPoll(false);
    }
  };

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
          Comunidade estável
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
            <p className="mt-2 font-heading text-3xl font-black text-white">38</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-400">+7 nesta semana</p>
          </div>
          <MiniBarChart values={[4, 6, 5, 8, 7, 9, 6]} color="bg-emerald-500" />
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
            <p className="mt-2 font-heading text-3xl font-black text-white">124</p>
            <p className="mt-1 text-[11px] font-semibold text-brand-orange">+18% vs. ontem</p>
          </div>
          <MiniBarChart values={[10, 15, 12, 18, 20, 25, 22]} color="bg-brand-orange" />
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
            <p className="mt-2 font-heading text-3xl font-black text-white">3</p>
            <p className="mt-1 text-[11px] font-semibold text-brand-orange">2 prioritárias</p>
          </div>
          <MiniBarChart values={[1, 2, 0, 1, 3, 2, 3]} color="bg-amber-400" />
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
            <p className="mt-2 font-heading text-3xl font-black text-white">68%</p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-400">+6 p.p. em 7 dias</p>
          </div>
          <MiniBarChart values={[50, 55, 60, 58, 62, 65, 68]} color="bg-emerald-500" />
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
                <span className="text-xs font-bold text-brand-orange">3 denúncias abertas</span>
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
                  {reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
                            {rep.user_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{rep.user_name}</p>
                            <p className="text-gray-400 text-[11px] truncate italic">{rep.content}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-300 font-semibold">{rep.reason}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">{rep.reports_count} denúncias</td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">{rep.time_ago}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          rep.priority === "Alta"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : rep.priority === "Média"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-white/10 text-gray-400"
                        }`}>
                          {rep.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" className="rounded border border-brand-orange/40 px-2.5 py-1 text-[11px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">
                            Revisar
                          </button>
                          <button type="button" className="text-gray-500 hover:text-white">⋮</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/10 p-3">
              <Link href="/admin/community/moderation" className="text-xs font-bold text-brand-orange hover:underline">
                Abrir central de moderação →
              </Link>
            </div>
          </section>

          {/* DOIS CARDS LADO A LADO: ATIVIDADE & DESTQUES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ATIVIDADE NO BRICKBOARD */}
            <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-white">Atividade no Brickboard</h3>
                <p className="mt-1 text-xs text-gray-400">286 interações nos últimos 7 dias</p>
                <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">+14% vs. 7 dias anteriores</p>
              </div>

              {/* GRÁFICO DE BARRAS DE ATIVIDADE */}
              <div className="mt-6 flex items-end justify-between gap-2 h-28 border-b border-white/10 pb-2">
                {[
                  { day: "22/07", posts: 40, comments: 60 },
                  { day: "23/07", posts: 55, comments: 75 },
                  { day: "24/07", posts: 45, comments: 65 },
                  { day: "25/07", posts: 60, comments: 80 },
                  { day: "26/07", posts: 70, comments: 85 },
                  { day: "27/07", posts: 50, comments: 70 },
                  { day: "28/07", posts: 65, comments: 90 },
                ].map((d) => (
                  <div key={d.day} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      <span style={{ height: `${d.posts}%` }} className="w-2 bg-brand-orange rounded-t-sm" />
                      <span style={{ height: `${d.comments}%` }} className="w-2 bg-gray-500 rounded-t-sm" />
                    </div>
                    <span className="mt-2 text-[9px] font-semibold text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-orange" /> Posts</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-500" /> Respostas</span>
              </div>
            </div>

            {/* CONVERSAS EM DESTAQUE */}
            <div className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-white mb-3">Conversas em destaque</h3>
                <div className="space-y-3">
                  {[
                    { title: "FINAL FANTASY XIV REVELA BASTION E DATA NO SWITCH 2", author: "Marina Souza", replies: 78, hype: "1.2k" },
                    { title: "GOD OF WAR: LAUFEY ANÚNCIO FOCADO NA FAYE", author: "Gustavo Lima", replies: 54, hype: "987" },
                    { title: "XBOX TESTA CLOUD GAMING GRATUITO E SEM GAME PASS COM ANÚNCIOS", author: "Caio Nogueira", replies: 43, hype: "642" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-white uppercase text-[11px]">{item.title}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{item.author}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[11px]">
                        <span className="text-gray-400">{item.replies} resp</span>
                        <span className="text-brand-orange font-bold">🔥 {item.hype}</span>
                        <span className="text-emerald-400 font-bold text-[10px]">🟢 Ativa</span>
                      </div>
                    </div>
                  ))}
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
              <span className="text-[10px] text-gray-500">📅 25/07/2026</span>
            </div>

            <p className="text-xs font-bold text-white leading-snug">
              {poll?.question || "O que você achou do anúncio de God of War: Laufey focado na Faye no pós-morte?"}
            </p>

            <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-white/10 pb-2">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/20">Publicada</span>
              <span>124 participações</span>
              <span>🕒 Encerra em 8h</span>
            </div>

            {/* OPÇÕES DA PERGUNTA COM PORCENTAGEM */}
            <div className="space-y-2 text-xs">
              {[
                { label: "Hype total! Quero ver o combate rúnico e a magia...", pct: 18 },
                { label: "Gostei, mas preferia um jogo focado no Kratos de cara", pct: 27 },
                { label: "Interessante ver o pós-morte espiritual (Everywhin)...", pct: 9 },
                { label: "Ficou perfeito, Faye sempre foi o coração da história.", pct: 46 },
              ].map((opt, i) => (
                <div key={i} className="relative overflow-hidden rounded border border-white/10 bg-white/[0.02] p-2">
                  <div style={{ width: `${opt.pct}%` }} className="absolute inset-y-0 left-0 bg-white/5" />
                  <div className="relative flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-gray-300">{opt.label}</span>
                    <span className="font-bold text-white">{opt.pct}%</span>
                  </div>
                </div>
              ))}
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
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">🟢 Saudável</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>💬 Denúncias resolvidas em até 1h</span>
                  <span className="font-bold text-white">92%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>💬 Conversas sem resposta</span>
                  <span className="font-bold text-white">12%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "12%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1 text-gray-300">
                  <span>🙂 Sentimento positivo</span>
                  <span className="font-bold text-white">74%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "74%" }} />
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
                <button type="button" className="rounded border border-brand-orange/40 px-2 py-1 text-[10px] font-bold text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">
                  Gerenciar
                </button>
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
                    <td className="py-2 px-1 text-gray-300 font-semibold">{Math.floor(Math.random() * 40) + 10}</td>
                    <td className="py-2 px-1 font-bold text-emerald-400">🟢 Ativo</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-gray-500">
              <Link href="/admin/releases" className="text-xs text-brand-orange font-semibold hover:underline">Ver todos →</Link>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPageTopics(p => Math.max(1, p - 1))} disabled={currentPageTopics === 1} className="px-1.5 py-0.5 border border-white/10 rounded disabled:opacity-20">‹</button>
                <span className="text-white font-bold">{currentPageTopics}</span>
                <button onClick={() => setCurrentPageTopics(p => Math.min(totalTopicPages, p + 1))} disabled={currentPageTopics === totalTopicPages} className="px-1.5 py-0.5 border border-white/10 rounded disabled:opacity-20">›</button>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* MODAL DE CRIAR/EDITAR PERGUNTA DO DIA */}
      {showNewPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0e0f14] p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-heading text-base font-bold">Pergunta do dia</h3>
              <button type="button" onClick={() => setShowNewPollModal(false)} className="text-gray-400 hover:text-white">✕</button>
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
    </AdminShell>
  );
}
