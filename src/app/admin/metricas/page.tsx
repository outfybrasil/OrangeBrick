"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/client";

type AccountMetric = {
  platform: "instagram" | "tiktok" | "youtube";
  captured_on: string;
  followers: number | null;
  following: number | null;
  total_posts: number | null;
  total_views: number | null;
  total_likes: number | null;
  error: string | null;
};

type Metrics = {
  site: { visitors: number; pageviews: number; daily: { day: string; views: number; visitors: number }[]; pages: { path: string; views: number }[] };
  readers: number; views: number; reactions: number; comments: number;
  daily: { day: string; views: number; interactions: number }[];
  top: { id: string; title: string; slug: string; views: number; interactions: number }[];
  social: { post_id: string; platform: "instagram" | "tiktok" | "youtube"; slug: string; title: string; cta_variant?: "comment" | "follow"; captured_on?: string; views?: number | null; reach?: number | null; average_watch_milliseconds?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null; follows?: number | null; clicks: number; error?: string | null }[];
  accounts?: AccountMetric[];
};

const number = (value: number) => value.toLocaleString("pt-BR");
const metric = (value: number | null | undefined) => value === null || value === undefined ? "—" : number(value);
const platformName = (value: string) => value === "instagram" ? "Instagram" : value === "tiktok" ? "TikTok" : "YouTube";
const watchTime = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;

export default function MetricsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) throw new Error("Entre com sua conta administrativa para consultar as métricas.");
        const response = await fetch(`/api/admin/metrics?days=${days}`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(response.status === 403 ? "Confirme seu acesso administrativo com autenticação em duas etapas." : result.error);
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as métricas.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [days, refresh]);

  const maximum = Math.max(1, ...(data?.site.daily.flatMap(day => [day.views, day.visitors]) || []));
  return (
    <AdminShell active="metrics" title="Audiência e interações" description="Acompanhe os acessos ao site e as interações dos leitores.">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label htmlFor="metrics-period" className="text-sm text-gray-300">Período</label>
        <select id="metrics-period" value={days} onChange={event => setDays(Number(event.target.value))} className="min-h-11 rounded-lg border border-white/20 bg-[#16171d] px-3 text-sm text-white">
          {[7, 30, 90].map(value => <option key={value} value={value}>Últimos {value} dias</option>)}
        </select>
        <button onClick={() => setRefresh(value => value + 1)} disabled={loading} className="min-h-11 rounded-lg border border-white/20 px-4 text-sm disabled:opacity-50">Atualizar</button>
      </div>
      {loading && <p role="status" className="py-8 text-gray-400">Carregando métricas…</p>}
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</p>}
      {data && <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Visitantes estimados", data.site.visitors], ["Páginas visualizadas", data.site.pageviews], ["Reações", data.reactions], ["Comentários", data.comments]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-[#0e0f14] p-4"><p className="text-xs text-gray-400">{label}</p><p className="mt-2 break-words text-3xl font-bold text-white">{number(Number(value))}</p></div>)}
        </div>
        {data.accounts && data.accounts.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6">
            <h2 className="font-heading text-lg font-bold">Seguidores e canais OB Labs</h2>
            <p className="mt-1 text-xs text-gray-400">Total acumulado de seguidores por rede nas coletas mais recentes.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["instagram", "tiktok", "youtube"] as const).map(platform => {
                const latest = data.accounts?.find(a => a.platform === platform);
                return (
                  <div key={platform} className="min-w-0 rounded-xl border border-white/10 bg-[#16171d] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-orange">{platformName(platform)}</span>
                      <span className="text-xs text-gray-400">{latest?.captured_on || "—"}</span>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-white">{metric(latest?.followers)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {platform === "youtube" ? "inscritos no canal" : "seguidores na conta"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6">
          <h2 className="font-heading text-lg font-bold">Evolução diária</h2>
          <p className="mt-1 text-xs text-gray-400">Horário de Brasília · <span className="text-brand-orange">laranja: páginas visualizadas</span> · <span className="text-emerald-400">verde: visitantes</span></p>
          {data.site.pageviews === 0 && <p className="mt-4 text-sm text-gray-400">Nenhuma atividade registrada neste período.</p>}
          <p className="mt-3 text-xs text-gray-500">Deslize o gráfico para consultar os dias anteriores.</p>
          <div ref={node => { if (node) node.scrollLeft = node.scrollWidth; }} className="mt-5 overflow-x-auto" tabIndex={0} aria-label="Gráfico diário de páginas visualizadas e visitantes">
            <div className="flex h-52 items-end gap-2" style={{ minWidth: `${Math.max(280, days * 28)}px` }}>
              {data.site.daily.map(day => <div key={day.day} className="flex h-full min-w-5 flex-1 flex-col justify-end" title={`${day.day}: ${day.views} páginas visualizadas e ${day.visitors} visitantes`}>
                <div className="flex h-40 items-end justify-center gap-0.5" aria-hidden="true"><div className="w-2/5 rounded-t bg-brand-orange" style={{ height: `${day.views / maximum * 100}%` }} /><div className="w-2/5 rounded-t bg-emerald-400" style={{ height: `${day.visitors / maximum * 100}%` }} /></div>
                <span className="mt-2 text-center text-[10px] text-gray-400">{day.day.slice(8)}/{day.day.slice(5, 7)}</span>
              </div>)}
            </div>
          </div>
          <details className="mt-4 text-sm text-gray-400"><summary className="min-h-11 cursor-pointer py-3">Consultar valores diários</summary><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><caption className="sr-only">Páginas visualizadas e visitantes por dia</caption><thead><tr><th scope="col">Data</th><th scope="col">Páginas visualizadas</th><th scope="col">Visitantes</th></tr></thead><tbody>{data.site.daily.map(day => <tr key={day.day}><td className="py-2">{day.day.split("-").reverse().join("/")}</td><td>{number(day.views)}</td><td>{number(day.visitors)}</td></tr>)}</tbody></table></div></details>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6"><h2 className="font-heading text-lg font-bold">Páginas mais acessadas</h2><div className="mt-4 space-y-3">{data.site.pages.length === 0 && <p className="text-sm text-gray-400">A coleta começa após a atualização, com o consentimento dos visitantes.</p>}{data.site.pages.map(page => <div key={page.path} className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-all text-gray-300">{page.path}</span><span className="shrink-0 font-bold text-brand-orange">{number(page.views)}</span></div>)}</div></section>
        <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6"><h2 className="font-heading text-lg font-bold">Desempenho dos Reels</h2><p className="mt-1 text-xs text-gray-400">Métricas mais recentes no período selecionado e cliques nos links do Orange Brick.</p>{data.social.length === 0 ? <p className="mt-4 text-sm text-gray-400">A primeira coleta começa depois que a migration e o cron forem publicados.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-xs"><caption className="sr-only">Métricas dos Reels por plataforma</caption><thead className="text-gray-400"><tr><th scope="col" className="p-2">Plataforma e matéria</th><th scope="col" className="p-2">CTA</th><th scope="col" className="p-2">Visualizações</th><th scope="col" className="p-2">Alcance</th><th scope="col" className="p-2">Retenção média</th><th scope="col" className="p-2">Curtidas</th><th scope="col" className="p-2">Comentários</th><th scope="col" className="p-2">Compartilhamentos</th><th scope="col" className="p-2">Salvamentos</th><th scope="col" className="p-2">Seguidores</th><th scope="col" className="p-2">Cliques</th></tr></thead><tbody>{data.social.map(row => <tr key={`${row.post_id}:${row.platform}`} className="border-t border-white/10 align-top"><td className="max-w-64 p-2"><span className="text-brand-orange">{platformName(row.platform)}</span><Link className="mt-1 block text-sm font-semibold text-white hover:text-brand-orange" href={`/posts/${row.slug}`}>{row.title}</Link><span className="mt-1 block text-gray-500">{row.captured_on ? `Coletado em ${row.captured_on}` : "Aguardando primeira coleta"}</span>{row.error && <span className="mt-1 block max-w-56 text-amber-300">{row.error}</span>}</td><td className="p-2"><span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${row.cta_variant === "follow" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-gray-300 border border-white/15"}`}>{row.cta_variant === "follow" ? "➕ Seguir" : "💬 Comentário"}</span></td><td className="p-2">{metric(row.views)}</td><td className="p-2">{metric(row.reach)}</td><td className="p-2">{watchTime(row.average_watch_milliseconds)}</td><td className="p-2">{metric(row.likes)}</td><td className="p-2">{metric(row.comments)}</td><td className="p-2">{metric(row.shares)}</td><td className="p-2">{metric(row.saves)}</td><td className="p-2">{metric(row.follows)}</td><td className="p-2">{number(row.clicks)}</td></tr>)}</tbody></table></div>}</section>
        <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6"><h2 className="font-heading text-lg font-bold">Matérias mais lidas no período</h2><p className="mt-2 text-sm text-gray-400">{number(data.views)} leituras históricas registradas · {number(data.readers)} dispositivos distintos</p><div className="mt-4 divide-y divide-white/10">{data.top.length === 0 && <p className="text-sm text-gray-400">Ainda não há leituras registradas.</p>}{data.top.map((post, index) => <div key={post.id} className="flex items-start gap-3 py-4"><span className="font-bold text-brand-orange">{index + 1}</span><div className="min-w-0 flex-1"><Link className="break-words text-sm font-semibold hover:text-brand-orange" href={`/posts/${post.slug}`}>{post.title}</Link><p className="mt-1 text-xs text-gray-400">{number(post.views)} leituras · {number(post.interactions)} interações</p></div></div>)}</div></section>
        <section className="rounded-xl border border-white/10 bg-[#0e0f14] p-4 sm:p-6"><h2 className="font-heading text-lg font-bold">Matérias mais lidas no período</h2><p className="mt-2 text-sm text-gray-400">{number(data.views)} leituras históricas registradas · {number(data.readers)} dispositivos distintos</p><div className="mt-4 divide-y divide-white/10">{data.top.length === 0 && <p className="text-sm text-gray-400">Ainda não há leituras registradas.</p>}{data.top.map((post, index) => <div key={post.id} className="flex items-start gap-3 py-4"><span className="font-bold text-brand-orange">{index + 1}</span><div className="min-w-0 flex-1"><Link className="break-words text-sm font-semibold hover:text-brand-orange" href={`/posts/${post.slug}`}>{post.title}</Link><p className="mt-1 text-xs text-gray-400">{number(post.views)} leituras · {number(post.interactions)} interações</p></div></div>)}</div></section>
        <p className="text-xs leading-6 text-gray-400">Acessos e visitantes abrangem páginas públicas com consentimento, a partir desta atualização. Não representam toda a audiência: bloqueadores e recusas de cookies reduzem os totais. Visitantes são dispositivos estimados, não pessoas identificadas. O ADM e telas de autenticação ficam fora da coleta. O histórico de matérias segue uma contagem diferente: Leituras são deduplicadas por matéria e dispositivo ou IP; retornos à mesma matéria não contam novamente. Leitores são dispositivos distintos estimados, não pessoas identificadas. Reações e comentários refletem os registros que permanecem salvos, agrupados pela data de criação. Dias anteriores à coleta podem não ter dados.</p>
      </div>}
    </AdminShell>
  );
}
