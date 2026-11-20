"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ExplorerFile {
  path: string;
  bytes: number;
  updatedAt: string | null;
  mimetype: string | null;
  protected: boolean;
}

export interface BucketSummary {
  id: string;
  files: number;
  bytes: number;
}

interface StorageExplorerProps {
  buckets: BucketSummary[];
  initialBucket: string;
  initialFiles: ExplorerFile[];
  onAfterDelete: () => Promise<void>;
}

type SortKey = "name" | "type" | "date" | "size";
type SortDir = "asc" | "desc";

interface ExplorerEntry {
  kind: "folder" | "file";
  name: string;
  fullPath: string;
  bytes: number;
  fileCount: number;
  updatedAt: string | null;
  mimetype: string | null;
  protected: boolean;
  childPaths: string[];
}

const BUCKET_LABELS: Record<string, string> = {
  "editorial-reels": "Vídeos (Reels e longos)",
  "post-images": "Imagens das matérias",
  "social-post-media": "Mídia de carrosséis",
  "social-post-drafts": "Rascunhos sociais",
  "profile-images": "Avatares e perfis",
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2).replace(".", ",")} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 0.1) return `${mb.toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileTypeLabel(entry: ExplorerEntry): string {
  if (entry.kind === "folder") {
    return `Pasta (${entry.fileCount} ${entry.fileCount === 1 ? "item" : "itens"})`;
  }
  const ext = entry.name.includes(".") ? entry.name.split(".").pop()?.toLowerCase() : "";
  if (ext === "mp4" || ext === "mov" || ext === "webm" || entry.mimetype?.startsWith("video/")) return "Vídeo MP4";
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp" || entry.mimetype?.startsWith("image/")) {
    return ext ? `Imagem ${ext.toUpperCase()}` : "Imagem";
  }
  if (ext === "srt") return "Legenda SRT";
  if (ext === "json") return "Arquivo JSON";
  return ext ? `Arquivo ${ext.toUpperCase()}` : "Arquivo";
}

function EntryIcon({ entry }: { entry: ExplorerEntry }) {
  if (entry.kind === "folder") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor">
        <path d="M3 6a2 2 0 0 1 2-2h4.6a2 2 0 0 1 1.4.58l1.42 1.42H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
      </svg>
    );
  }
  const lower = entry.name.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || entry.mimetype?.startsWith("video/")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-brand-orange" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (/\.(jpg|jpeg|png|webp|gif)$/.test(lower) || entry.mimetype?.startsWith("image/")) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5-6 6-2-2-5 5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
      <path d="M14 3v6h6" />
    </svg>
  );
}

export function StorageExplorer({
  buckets,
  initialBucket,
  initialFiles,
  onAfterDelete,
}: StorageExplorerProps) {
  const [bucket, setBucket] = useState(initialBucket);
  const [filesByBucket, setFilesByBucket] = useState<Record<string, ExplorerFile[]>>({
    [initialBucket]: initialFiles,
  });
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewingPath, setPreviewingPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const currentBucketFiles = useMemo(
    () => filesByBucket[bucket] ?? (bucket === initialBucket ? initialFiles : []),
    [bucket, filesByBucket, initialBucket, initialFiles],
  );

  async function selectBucket(nextBucket: string, forceReload = false) {
    setBucket(nextBucket);
    setCurrentPath("");
    setSearch("");
    setSelectedPaths(new Set());
    setConfirmingDelete(false);
    setFeedback(null);
    if (!forceReload && filesByBucket[nextBucket]) return;

    setLoadingBucket(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const res = await fetch(`/api/admin/infra?action=browse&bucket=${encodeURIComponent(nextBucket)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível abrir este bucket.");
      setFilesByBucket((prev) => ({ ...prev, [nextBucket]: (json.files || []) as ExplorerFile[] }));
    } catch (cause) {
      setFeedback({ type: "err", text: cause instanceof Error ? cause.message : "Erro ao carregar pasta." });
    } finally {
      setLoadingBucket(false);
    }
  }

  const entries = useMemo<ExplorerEntry[]>(() => {
    const prefix = currentPath ? `${currentPath}/` : "";
    const folders = new Map<string, ExplorerEntry>();
    const files: ExplorerEntry[] = [];

    for (const file of currentBucketFiles) {
      if (prefix && !file.path.startsWith(prefix)) continue;
      const relative = prefix ? file.path.slice(prefix.length) : file.path;
      if (!relative) continue;
      const slashIndex = relative.indexOf("/");
      if (slashIndex === -1) {
        files.push({
          kind: "file",
          name: relative,
          fullPath: file.path,
          bytes: file.bytes,
          fileCount: 1,
          updatedAt: file.updatedAt,
          mimetype: file.mimetype,
          protected: file.protected,
          childPaths: file.protected ? [] : [file.path],
        });
      } else {
        const folderName = relative.slice(0, slashIndex);
        const folderPath = prefix ? `${prefix}${folderName}` : folderName;
        const existing = folders.get(folderPath);
        if (existing) {
          existing.bytes += file.bytes;
          existing.fileCount += 1;
          if (!file.protected) existing.childPaths.push(file.path);
          if (file.protected) existing.protected = true;
          if (file.updatedAt && (!existing.updatedAt || file.updatedAt > existing.updatedAt)) {
            existing.updatedAt = file.updatedAt;
          }
        } else {
          folders.set(folderPath, {
            kind: "folder",
            name: folderName,
            fullPath: folderPath,
            bytes: file.bytes,
            fileCount: 1,
            updatedAt: file.updatedAt,
            mimetype: null,
            protected: file.protected,
            childPaths: file.protected ? [] : [file.path],
          });
        }
      }
    }

    const q = search.trim().toLowerCase();
    const filterFn = (entry: ExplorerEntry) => !q || entry.name.toLowerCase().includes(q);
    const compare = (a: ExplorerEntry, b: ExplorerEntry) => {
      let diff = 0;
      if (sortKey === "name") diff = a.name.localeCompare(b.name, "pt-BR");
      else if (sortKey === "type") diff = fileTypeLabel(a).localeCompare(fileTypeLabel(b), "pt-BR");
      else if (sortKey === "date") diff = (a.updatedAt || "").localeCompare(b.updatedAt || "");
      else diff = a.bytes - b.bytes;
      return sortDir === "asc" ? diff : -diff;
    };

    const sortedFolders = [...folders.values()].filter(filterFn).sort(compare);
    const sortedFiles = files.filter(filterFn).sort(compare);
    return [...sortedFolders, ...sortedFiles];
  }, [currentBucketFiles, currentPath, search, sortKey, sortDir]);

  const selectablePathsInView = useMemo(() => {
    const all: string[] = [];
    for (const entry of entries) {
      for (const path of entry.childPaths) all.push(path);
    }
    return all;
  }, [entries]);

  const selectedBytes = useMemo(() => {
    let total = 0;
    for (const file of currentBucketFiles) {
      if (selectedPaths.has(file.path)) total += file.bytes;
    }
    return total;
  }, [currentBucketFiles, selectedPaths]);

  const allInViewSelected =
    selectablePathsInView.length > 0
    && selectablePathsInView.every((path) => selectedPaths.has(path));

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "name" || nextKey === "type" ? "asc" : "desc");
    }
  }

  function toggleEntrySelection(entry: ExplorerEntry) {
    if (!entry.childPaths.length) return;
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      const everySelected = entry.childPaths.every((p) => next.has(p));
      if (everySelected) {
        for (const p of entry.childPaths) next.delete(p);
      } else {
        for (const p of entry.childPaths) next.add(p);
      }
      return next;
    });
    setConfirmingDelete(false);
  }

  function toggleAllInView() {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (allInViewSelected) {
        for (const p of selectablePathsInView) next.delete(p);
      } else {
        for (const p of selectablePathsInView) next.add(p);
      }
      return next;
    });
    setConfirmingDelete(false);
  }

  function navigateUp() {
    if (!currentPath) return;
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
    setSearch("");
    setConfirmingDelete(false);
  }

  async function openPreview(filePath: string) {
    setPreviewingPath(filePath);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const res = await fetch(
        `/api/admin/infra?action=preview&bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Não foi possível abrir o arquivo.");
      window.open(json.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setFeedback({ type: "err", text: cause instanceof Error ? cause.message : "Erro ao abrir visualização." });
    } finally {
      setPreviewingPath(null);
    }
  }

  async function deleteSelected() {
    const paths = [...selectedPaths];
    if (!paths.length) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) throw new Error("Sessão expirada.");
      const res = await fetch("/api/admin/infra", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bucket, paths }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível apagar os arquivos.");

      const deletedSet = new Set(paths);
      setFilesByBucket((prev) => ({
        ...prev,
        [bucket]: (prev[bucket] || []).filter((file) => !deletedSet.has(file.path)),
      }));
      setSelectedPaths(new Set());
      setConfirmingDelete(false);
      setFeedback({
        type: "ok",
        text: `${json.deleted} ${json.deleted === 1 ? "arquivo removido" : "arquivos removidos"} de ${bucket} (${formatBytes(selectedBytes)} liberados).`,
      });
      await onAfterDelete();
    } catch (cause) {
      setFeedback({ type: "err", text: cause instanceof Error ? cause.message : "Erro ao apagar arquivos." });
    } finally {
      setDeleting(false);
    }
  }

  const breadcrumbs = currentPath ? currentPath.split("/") : [];

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-surface">
      {/* Cabeçalho do Explorer */}
      <div className="border-b border-white/10 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-black text-white">Explorador de Arquivos (Supabase Storage)</h2>
            <p className="text-xs text-gray-400">
              Navegue pelas pastas como no Windows Explorer, marque arquivos ou pastas inteiras e apague em lote.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void selectBucket(bucket, true)}
            disabled={loadingBucket}
            className="min-h-8 rounded-lg border border-white/15 bg-white/[0.03] px-3 text-xs font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loadingBucket ? "Lendo..." : "Recarregar pasta"}
          </button>
        </div>
      </div>

      {/* Layout estilo Windows Explorer: barra lateral de unidades (buckets) + área principal */}
      <div className="grid lg:grid-cols-[15rem_1fr]">
        {/* Sidebar de Unidades / Buckets */}
        <aside className="border-b border-white/10 bg-white/[0.015] p-3 lg:border-r lg:border-b-0">
          <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Buckets (Unidades)
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {buckets.map((item) => {
              const active = item.id === bucket;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void selectBucket(item.id)}
                  className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors lg:w-full ${
                    active
                      ? "bg-brand-orange/15 font-bold text-brand-orange ring-1 ring-brand-orange/30"
                      : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M4 6h16v12H4z" />
                      <path d="M4 14h16M8 10h2" />
                    </svg>
                    <span className="truncate">{BUCKET_LABELS[item.id] || item.id}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] opacity-80">{formatBytes(item.bytes)}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Área de Navegação e Tabela */}
        <div className="min-w-0">
          {/* Barra de endereço (Breadcrumb) + Busca */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={navigateUp}
              disabled={!currentPath}
              title="Subir um nível"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              ↑
            </button>

            <nav aria-label="Caminho da pasta" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#0a0b0e] px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCurrentPath("");
                  setSearch("");
                }}
                className={`font-semibold hover:text-brand-orange ${currentPath ? "text-gray-300" : "text-brand-orange"}`}
              >
                {bucket}
              </button>
              {breadcrumbs.map((segment, index) => {
                const target = breadcrumbs.slice(0, index + 1).join("/");
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <span key={target} className="flex items-center gap-1">
                    <span className="text-gray-600">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPath(target);
                        setSearch("");
                      }}
                      className={`truncate hover:text-brand-orange ${isLast ? "font-bold text-white" : "text-gray-300"}`}
                    >
                      {segment}
                    </button>
                  </span>
                );
              })}
            </nav>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar nesta pasta..."
              className="h-8 w-full rounded-lg border border-white/10 bg-[#0a0b0e] px-3 text-xs text-white placeholder:text-gray-500 focus:border-brand-orange/60 focus:outline-none sm:w-48"
            />
          </div>

          {/* Aviso de cuidado ao navegar em post-images */}
          {bucket === "post-images" && (
            <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-200">
              Atenção: este bucket guarda as imagens publicadas nas matérias do site. Apague apenas arquivos que você tiver certeza que não estão em uso.
            </div>
          )}

          {/* Feedback de ação */}
          {feedback && (
            <div
              role="status"
              className={`border-b px-4 py-2.5 text-xs ${
                feedback.type === "ok"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/20 bg-red-500/10 text-red-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Barra de seleção em lote */}
          {selectedPaths.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-orange/30 bg-brand-orange/10 px-4 py-2.5 text-xs">
              <div className="text-white">
                <strong>{selectedPaths.size}</strong> {selectedPaths.size === 1 ? "arquivo selecionado" : "arquivos selecionados"} ·{" "}
                <strong className="text-brand-orange">{formatBytes(selectedBytes)}</strong> serão liberados
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {confirmingDelete ? (
                  <>
                    <span className="font-semibold text-amber-200">Tem certeza? Essa ação é irreversível.</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void deleteSelected()}
                      className="min-h-8 rounded-lg bg-red-500 px-3 font-bold text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting ? "Apagando..." : `Confirmar exclusão (${selectedPaths.size})`}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmingDelete(false)}
                      className="min-h-8 rounded-lg border border-white/20 px-3 text-gray-200 hover:bg-white/10"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedPaths(new Set())}
                      className="min-h-8 rounded-lg border border-white/15 px-3 text-gray-200 hover:bg-white/10"
                    >
                      Limpar seleção
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="min-h-8 rounded-lg bg-red-500 px-3 font-bold text-white hover:bg-red-600"
                    >
                      Apagar selecionados
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tabela estilo Detalhes do Windows Explorer */}
          <div className="max-h-[34rem] overflow-auto">
            {loadingBucket ? (
              <p className="p-6 text-xs text-gray-400">Carregando arquivos de {bucket}...</p>
            ) : entries.length === 0 ? (
              <p className="p-6 text-xs text-gray-500">Esta pasta está vazia.</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#111318] text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todos desta pasta"
                        checked={allInViewSelected}
                        disabled={selectablePathsInView.length === 0}
                        onChange={toggleAllInView}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-brand-orange"
                      />
                    </th>
                    <th className="px-2 py-2.5">
                      <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-white">
                        Nome {sortKey === "name" && (sortDir === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th className="w-36 px-2 py-2.5">
                      <button type="button" onClick={() => toggleSort("type")} className="inline-flex items-center gap-1 hover:text-white">
                        Tipo {sortKey === "type" && (sortDir === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th className="w-36 px-2 py-2.5">
                      <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-white">
                        Modificado {sortKey === "date" && (sortDir === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th className="w-24 px-2 py-2.5 text-right">
                      <button type="button" onClick={() => toggleSort("size")} className="inline-flex items-center gap-1 hover:text-white">
                        Tamanho {sortKey === "size" && (sortDir === "asc" ? "▲" : "▼")}
                      </button>
                    </th>
                    <th className="w-24 px-3 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {entries.map((entry) => {
                    const isChecked =
                      entry.childPaths.length > 0
                      && entry.childPaths.every((p) => selectedPaths.has(p));
                    const isPartial =
                      !isChecked
                      && entry.childPaths.some((p) => selectedPaths.has(p));
                    const canSelect = entry.childPaths.length > 0;

                    return (
                      <tr
                        key={entry.fullPath}
                        className={`transition-colors ${
                          isChecked ? "bg-brand-orange/[0.08]" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${entry.name}`}
                            checked={isChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = isPartial;
                            }}
                            disabled={!canSelect}
                            onChange={() => toggleEntrySelection(entry)}
                            className="h-4 w-4 rounded border-white/20 bg-transparent accent-brand-orange disabled:opacity-30"
                          />
                        </td>
                        <td className="max-w-xs px-2 py-2">
                          {entry.kind === "folder" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentPath(entry.fullPath);
                                setSearch("");
                              }}
                              className="flex w-full items-center gap-2 text-left font-semibold text-white hover:text-brand-orange"
                            >
                              <EntryIcon entry={entry} />
                              <span className="truncate">{entry.name}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <EntryIcon entry={entry} />
                              <span className="truncate font-mono text-gray-200" title={entry.name}>
                                {entry.name}
                              </span>
                              {entry.protected && (
                                <span className="shrink-0 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                                  Sistema
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-400">{fileTypeLabel(entry)}</td>
                        <td className="px-2 py-2 text-gray-500">{formatDate(entry.updatedAt)}</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-gray-200">
                          {formatBytes(entry.bytes)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {entry.kind === "folder" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentPath(entry.fullPath);
                                setSearch("");
                              }}
                              className="rounded border border-white/15 px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-white/10"
                            >
                              Abrir
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={previewingPath === entry.fullPath}
                              onClick={() => void openPreview(entry.fullPath)}
                              className="rounded border border-white/15 px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-white/10 disabled:opacity-50"
                            >
                              {previewingPath === entry.fullPath ? "..." : "Ver"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Rodapé de status estilo barra inferior do Windows Explorer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0d0f14] px-4 py-2 text-[11px] text-gray-400">
            <span>
              {entries.length} {entries.length === 1 ? "item" : "itens"} nesta pasta ·{" "}
              {formatBytes(entries.reduce((sum, e) => sum + e.bytes, 0))}
            </span>
            <span>Dica: marque a caixa de uma pasta para selecionar todos os arquivos dentro dela.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
