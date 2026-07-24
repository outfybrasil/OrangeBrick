"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import type { CommunityPollRow, Topic } from "@/lib/types/database";

const today = new Date().toISOString().slice(0, 10);

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminUser(user)) {
      router.push("/admin/login");
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: topicData }, { data: pollData }, { data: eventData }] = await Promise.all([
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
    </AdminShell>
  );
}
