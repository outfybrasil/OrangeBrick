"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { StorageExplorer, type BucketSummary, type ExplorerFile } from "@/components/admin/StorageExplorer";
import { createClient } from "@/lib/supabase/client";

interface VpsSnapshot {
  collectedAt: string;
  updatedAt: string | null;
  stale: boolean;
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  cpu: { cores: number; load1: number; load5: number; load15: number };
  disk: { filesystem: string; mount: string; totalBytes: number; usedBytes: number; availBytes: number; percent: number };
  memory: { totalBytes: number; usedBytes: number; availBytes: number; percent: number };
  swap: { totalBytes: number; usedBytes: number; freeBytes: number; percent: number };
  folders: Array<{ label: string; bytes: number }>;
}

interface InfraData {
  vps: VpsSnapshot | null;
  storage: {
    bytes: number;
    files: number;
    quotaBytes: number;
    ratio: number;
    buckets: BucketSummary[];
    initialBucket: string;
    initialFiles: ExplorerFile[];
  };
  database: {
    totalRows: number;
    tables: Array<{ name: string; label: string; rows: number | null }>;
  };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2).replace(".", ",")} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 0.1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function barColor(percent: number): string {
  if (percent >= 85) return "bg-red-500";
  if (percent >= 70) return "bg-amber-400";
  return "bg-emerald-400";
}

function textTone(percent: number): string {
  if (percent >= 85) return "text-red-400";
  if (percent >= 70) return "text-amber-300";
  return "text-emerald-300";
}

export default function AdminInfraPage() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Entre com sua conta administrativa para consultar a infraestrutura.");
      const res = await fetch("/api/admin/infra", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Confirme seu acesso administrativo com autenticação em duas etapas." : json.error || "Falha ao carregar.");
      }
      setData(json as InfraData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const storagePercent = data ? Math.round(data.storage.ratio * 1000) / 10 : 0;

  return (
    <AdminShell
      active="infra"
      wide
      title="Infraestrutura · VPS e Banco"
      description="Acompanhe disco e memória da VPS, navegue pelos arquivos do Supabase Storage e monitore o banco de dados."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-9 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      }
    >
      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && !data && (
        <p role="status" className="py-12 text-sm text-gray-400">
          Consultando VPS, Storage e banco de dados…
        </p>
      )}

      {data && (
        <div className="space-y-6">
          {/* KPIs principais */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-xs text-gray-400">Disco da VPS</p>
              <p className={`mt-2 font-heading text-2xl font-black ${data.vps ? textTone(data.vps.disk.percent) : "text-gray-500"}`}>
                {data.vps ? `${data.vps.disk.percent}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.vps ? `${formatBytes(data.vps.disk.usedBytes)} / ${formatBytes(data.vps.disk.totalBytes)}` : "Sem coleta"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-xs text-gray-400">Memória RAM da VPS</p>
              <p className={`mt-2 font-heading text-2xl font-black ${data.vps ? textTone(data.vps.memory.percent) : "text-gray-500"}`}>
                {data.vps ? `${data.vps.memory.percent}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.vps ? `${formatBytes(data.vps.memory.usedBytes)} / ${formatBytes(data.vps.memory.totalBytes)}` : "Sem coleta"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-xs text-gray-400">Supabase Storage</p>
              <p className={`mt-2 font-heading text-2xl font-black ${textTone(storagePercent)}`}>
                {storagePercent}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatBytes(data.storage.bytes)} / {formatBytes(data.storage.quotaBytes)}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface p-4">
              <p className="text-xs text-gray-400">Registros no Banco</p>
              <p className="mt-2 font-heading text-2xl font-black text-white">
                {data.database.totalRows.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.database.tables.length} tabelas monitoradas
              </p>
            </div>
          </div>

          {/* Explorador estilo Windows Explorer */}
          <StorageExplorer
            buckets={data.storage.buckets}
            initialBucket={data.storage.initialBucket}
            initialFiles={data.storage.initialFiles}
            onAfterDelete={load}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            {/* Painel VPS */}
            <section className="rounded-xl border border-white/10 bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-black text-white">VPS · Servidor</h2>
                  <p className="text-xs text-gray-400">
                    {data.vps ? `${data.vps.hostname} · uptime ${formatUptime(data.vps.uptimeSeconds)}` : "Aguardando primeira coleta"}
                  </p>
                </div>
                {data.vps?.updatedAt && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      data.vps.stale
                        ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {data.vps.stale ? "Desatualizado · " : "Online · "}
                    {new Date(data.vps.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              {!data.vps ? (
                <p className="mt-4 text-sm text-gray-400">
                  Nenhuma leitura enviada pela VPS ainda. Execute <code className="text-gray-200">node scripts/report-vps-health.mjs</code> no servidor.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  <Meter
                    label="Disco (/)"
                    value={`${formatBytes(data.vps.disk.usedBytes)} usados · ${formatBytes(data.vps.disk.availBytes)} livres`}
                    percent={data.vps.disk.percent}
                  />
                  <Meter
                    label="Memória RAM"
                    value={`${formatBytes(data.vps.memory.usedBytes)} usados · ${formatBytes(data.vps.memory.availBytes)} disponíveis`}
                    percent={data.vps.memory.percent}
                  />
                  {data.vps.swap.totalBytes > 0 && (
                    <Meter
                      label="Swap"
                      value={`${formatBytes(data.vps.swap.usedBytes)} / ${formatBytes(data.vps.swap.totalBytes)}`}
                      percent={data.vps.swap.percent}
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs">
                    <span className="text-gray-400">CPU ({data.vps.cpu.cores} núcleos)</span>
                    <span className="font-mono text-gray-200">
                      Load: {data.vps.cpu.load1} · {data.vps.cpu.load5} · {data.vps.cpu.load15}
                    </span>
                  </div>

                  {data.vps.folders.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Maiores pastas do projeto na VPS
                      </p>
                      <div className="space-y-2">
                        {data.vps.folders.map((folder) => (
                          <div key={folder.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-mono text-gray-300">{folder.label}</span>
                            <span className="shrink-0 font-bold text-white">{formatBytes(folder.bytes)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Banco de Dados */}
            <section className="rounded-xl border border-white/10 bg-surface p-5">
              <h2 className="font-heading text-lg font-black text-white">Banco de Dados (PostgreSQL · Supabase)</h2>
              <p className="mt-1 text-xs text-gray-400">
                Volume de registros nas principais tabelas (limite gratuito: 500 MB no banco e 1 GB no Storage).
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.database.tables.map((table) => (
                  <div key={table.name} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <p className="text-xs text-gray-400">{table.label}</p>
                    <p className="mt-1 font-heading text-xl font-black text-white">
                      {table.rows === null ? "—" : table.rows.toLocaleString("pt-BR")}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{table.name}</p>
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

function Meter({ label, value, percent }: { label: string; value: string; percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-gray-200">{label}</span>
        <span className="text-gray-400">{value}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${barColor(percent)}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
