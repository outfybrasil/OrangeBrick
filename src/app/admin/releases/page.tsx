"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import { isManagedReleaseImageUrl } from "@/lib/release-images";
import type { ReleaseRadarItem, ReleaseRadarItemInsert } from "@/lib/types/database";

interface ReleaseDraft {
  id: string;
  game: string;
  release_label: string;
  release_date: string;
  schedule_label: string;
  platforms: string;
  image_url: string;
  badge: string;
  category: "week" | "upcoming";
  post_slug: string;
  sort_order: number;
  is_active: boolean;
}

interface PendingImage {
  id: string;
}

interface ReleaseMonthGroup {
  key: string;
  label: string;
  items: ReleaseRadarItem[];
}

const EMPTY_DRAFT: ReleaseDraft = {
  id: "",
  game: "",
  release_label: "",
  release_date: "",
  schedule_label: "",
  platforms: "",
  image_url: "",
  badge: "Lançamento",
  category: "week",
  post_slug: "",
  sort_order: 0,
  is_active: true,
};

function toDraft(item: ReleaseRadarItem): ReleaseDraft {
  return {
    id: item.id,
    game: item.game,
    release_label: item.release_label,
    release_date: item.release_date || "",
    schedule_label: item.schedule_label,
    platforms: item.platforms.join(", "),
    image_url: item.image_url || "",
    badge: item.badge,
    category: item.category,
    post_slug: item.post_slug || "",
    sort_order: item.sort_order,
    is_active: item.is_active,
  };
}

export default function AdminReleasesPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [items, setItems] = useState<ReleaseRadarItem[]>([]);
  const [draft, setDraft] = useState<ReleaseDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthGroups = useMemo<ReleaseMonthGroup[]>(() => {
    const formatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    const groups = new Map<string, ReleaseRadarItem[]>();
    items.forEach((item) => {
      const key = item.release_date?.slice(0, 7) || "sem-data";
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a === "sem-data" ? 1 : b === "sem-data" ? -1 : a.localeCompare(b))
      .map(([key, groupItems]) => ({
        key,
        label: key === "sem-data" ? "Sem data definida" : formatter.format(new Date(`${key}-01T12:00:00`)),
        items: [...groupItems].sort((a, b) => {
          const dateOrder = (a.release_date || "9999-12-31").localeCompare(b.release_date || "9999-12-31");
          if (dateOrder !== 0) return dateOrder;
          const order = a.sort_order - b.sort_order;
          return order !== 0 ? order : a.game.localeCompare(b.game, "pt-BR");
        }),
      }));
  }, [items]);

  const imageStats = useMemo(() => ({
    total: items.length,
    withImage: items.filter((item) => item.image_url?.trim()).length,
  }), [items]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isAdminUser(session.user)) throw new Error("Acesso negado");
      const { data, error: loadError } = await supabase
        .from("release_radar_items")
        .select("*")
        .order("sort_order", { ascending: true });
      if (loadError) throw loadError;
      setItems((data || []) as ReleaseRadarItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar o Radar");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadItems());
  }, [loadItems]);

  const updateDraft = <K extends keyof ReleaseDraft>(field: K, value: ReleaseDraft[K]) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    if (field === "image_url") setImageInfo(null);
  };

  const resetImageSource = () => {
    setSourceUrl("");
    setSourceFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeManagedImage = async (target: { imageId?: string; publicUrl?: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const response = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(target),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao remover a imagem");
      return true;
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Falha ao remover a imagem");
      return false;
    }
  };

  const openDraft = async (nextDraft: ReleaseDraft) => {
    if (pendingImage && !await removeManagedImage({ imageId: pendingImage.id })) return;
    setPendingImage(null);
    setDraft(nextDraft);
    setImageInfo(null);
    resetImageSource();
  };

  const closeDraft = async () => {
    if (pendingImage && !await removeManagedImage({ imageId: pendingImage.id })) return;
    setPendingImage(null);
    setDraft(null);
    setImageInfo(null);
    resetImageSource();
  };

  const importReleaseImage = async () => {
    if (!draft || isImporting) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) {
      setError("Defina primeiro um identificador válido para organizar a imagem.");
      return;
    }
    if (!sourceFile && !sourceUrl.trim()) {
      setError("Cole a URL original ou selecione um arquivo.");
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      if (pendingImage) {
        const removed = await removeManagedImage({ imageId: pendingImage.id });
        if (!removed) return;
        setPendingImage(null);
        updateDraft("image_url", "");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const formData = new FormData();
      formData.set("kind", "release");
      formData.set("releaseId", draft.id);
      formData.set("altText", `Arte promocional de ${draft.game || draft.id}`);
      if (sourceFile) {
        formData.set("file", sourceFile);
      } else {
        formData.set("sourceUrl", sourceUrl.trim());
      }
      const response = await fetch("/api/admin/images", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao importar a imagem");
      const image = payload.image as { id: string; public_url: string };
      const source = payload.source as { width: number; height: number };
      const output = payload.output as { width: number; height: number };
      setDraft((current) => current ? { ...current, image_url: image.public_url } : current);
      setPendingImage({ id: image.id });
      setImageInfo(
        source.width === output.width && source.height === output.height
          ? `${output.width} × ${output.height} · WebP salvo no Storage`
          : `${source.width} × ${source.height} → ${output.width} × ${output.height} · WebP salvo no Storage`
      );
      resetImageSource();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Falha ao importar a imagem");
    } finally {
      setIsImporting(false);
    }
  };

  const removeDraftImage = async () => {
    if (!draft) return;
    if (pendingImage && !await removeManagedImage({ imageId: pendingImage.id })) return;
    setPendingImage(null);
    updateDraft("image_url", "");
    setImageInfo("A arte será removida quando o jogo for salvo.");
    resetImageSource();
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.id)) {
      setError("O identificador deve usar letras minúsculas, números e hífens.");
      return;
    }
    if (!draft.game.trim() || !draft.release_label.trim() || !draft.schedule_label.trim()) {
      setError("Preencha nome, data e agenda.");
      return;
    }
    if (draft.image_url.trim() && !isManagedReleaseImageUrl(draft.image_url.trim())) {
      setError("Importe a arte para o Storage antes de salvar. URLs externas não são mais gravadas diretamente.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { error: topicError } = await supabase.from("topics").upsert({
        id: draft.id,
        name: draft.game.trim(),
        kind: "game",
        description: `Matérias, lançamentos e conversas sobre ${draft.game.trim()}.`,
        image_url: draft.image_url.trim() || null,
        is_active: draft.is_active,
        updated_at: new Date().toISOString(),
      });
      if (topicError) throw topicError;

      const payload = {
        id: draft.id,
        game: draft.game.trim(),
        release_label: draft.release_label.trim(),
        release_date: draft.release_date || null,
        schedule_label: draft.schedule_label.trim(),
        platforms: draft.platforms.split(",").map((platform) => platform.trim().toUpperCase()).filter(Boolean),
        image_url: draft.image_url.trim() || null,
        badge: draft.badge.trim() || "Lançamento",
        category: draft.category,
        post_slug: draft.post_slug.trim() || null,
        sort_order: Number(draft.sort_order) || 0,
        is_active: draft.is_active,
        topic_id: draft.id,
        updated_at: new Date().toISOString(),
      } satisfies ReleaseRadarItemInsert;
      const previousItem = items.find((item) => item.id === draft.id);
      const operation = previousItem
        ? supabase.from("release_radar_items").update(payload).eq("id", draft.id)
        : supabase.from("release_radar_items").insert(payload);
      const { error: saveError } = await operation;
      if (saveError) throw saveError;
      let cleanupFailed = false;
      if (
        previousItem?.image_url
        && previousItem.image_url !== payload.image_url
        && isManagedReleaseImageUrl(previousItem.image_url)
      ) {
        cleanupFailed = !await removeManagedImage({ publicUrl: previousItem.image_url });
      }
      await loadItems();
      if (cleanupFailed) {
        setError("O jogo foi salvo, mas o arquivo anterior não pôde ser removido do Storage.");
      }
      setPendingImage(null);
      setDraft(null);
      setImageInfo(null);
      resetImageSource();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar o jogo");
    } finally {
      setIsSaving(false);
    }
  };

  const cleanPreviousMonths = async () => {
    setIsCleaning(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");
      const response = await fetch("/api/cron/release-radar-cleanup", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha na limpeza");
      await loadItems();
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : "Falha na limpeza");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <AdminShell
      active="releases"
      title="Radar de lançamentos"
      description="Edite jogos, plataformas, ordem e artes em alta resolução sem alterar o código."
      actions={(
        <>
          <button
            type="button"
            onClick={() => void cleanPreviousMonths()}
            disabled={isCleaning}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-gray-300 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {isCleaning ? "Limpando…" : "Limpar meses anteriores"}
          </button>
          <button
            type="button"
            onClick={() => {
              void openDraft({ ...EMPTY_DRAFT, sort_order: (items.at(-1)?.sort_order || 0) + 10 });
            }}
            className="min-h-11 rounded-xl bg-brand-orange px-4 text-sm font-bold text-white transition-colors hover:bg-brand-orange/90"
          >
            Adicionar jogo
          </button>
        </>
      )}
      wide
    >
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {draft && (
        <section className="mb-7 border-y border-white/[0.08] py-5">
          <div className="mb-4 flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between">
            <h2 className="text-lg font-bold text-white">{items.some((item) => item.id === draft.id) ? "Editar jogo" : "Novo jogo"}</h2>
            <button type="button" onClick={() => void closeDraft()} className="min-h-11 rounded-xl px-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
              Cancelar
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-gray-400">
              Identificador
              <input value={draft.id} onChange={(event) => updateDraft("id", event.target.value)} disabled={items.some((item) => item.id === draft.id)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange disabled:opacity-55" />
            </label>
            <label className="text-xs font-semibold text-gray-400 xl:col-span-2">
              Nome oficial do jogo
              <input value={draft.game} onChange={(event) => updateDraft("game", event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Selo
              <input value={draft.badge} onChange={(event) => updateDraft("badge", event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Data exibida
              <input value={draft.release_label} onChange={(event) => updateDraft("release_label", event.target.value)} placeholder="28 de Julho" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Data para organização semanal
              <input type="date" value={draft.release_date} onChange={(event) => updateDraft("release_date", event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Dia ou agenda
              <input value={draft.schedule_label} onChange={(event) => updateDraft("schedule_label", event.target.value)} placeholder="Terça-feira" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Categoria
              <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value as ReleaseDraft["category"])} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange">
                <option value="week">Esta semana</option>
                <option value="upcoming">Próximos</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-400">
              Ordem
              <input type="number" value={draft.sort_order} onChange={(event) => updateDraft("sort_order", Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400 xl:col-span-2">
              Plataformas, separadas por vírgula
              <input value={draft.platforms} onChange={(event) => updateDraft("platforms", event.target.value)} placeholder="PC, PS5, XSX" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <label className="text-xs font-semibold text-gray-400 xl:col-span-2">
              Slug da matéria relacionada
              <input value={draft.post_slug} onChange={(event) => updateDraft("post_slug", event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-white outline-none focus:border-brand-orange" />
            </label>
            <fieldset className="space-y-3 md:col-span-2 xl:col-span-4">
              <legend className="text-xs font-semibold text-gray-300">Arte promocional 16:9</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-[11px] font-semibold text-gray-400">
                  URL original
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => {
                      setSourceUrl(event.target.value);
                      setSourceFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={isImporting}
                    placeholder="https://site-oficial.com/arte.jpg"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 text-xs text-white outline-none transition-colors placeholder:text-white/35 focus:border-brand-orange disabled:opacity-50"
                  />
                </label>
                <label className="text-[11px] font-semibold text-gray-400">
                  Ou arquivo do computador
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={isImporting}
                    onChange={(event) => {
                      setSourceFile(event.target.files?.[0] || null);
                      setSourceUrl("");
                    }}
                    className="mt-1.5 block min-h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-[#111218] px-3 py-2 text-xs text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-white/15 disabled:opacity-50"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Mínimo 1200 × 675. O arquivo é validado, convertido para WebP e salvo no Storage do Orange Brick.
                </p>
                <button
                  type="button"
                  onClick={() => void importReleaseImage()}
                  disabled={isImporting || (!sourceFile && !sourceUrl.trim())}
                  className="min-h-11 shrink-0 rounded-xl border border-brand-orange/40 bg-brand-orange/10 px-4 text-xs font-bold text-brand-orange transition-colors hover:bg-brand-orange/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isImporting ? "Importando…" : "Importar para o Storage"}
                </button>
              </div>
            </fieldset>
          </div>
          {draft.image_url.trim() && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="aspect-video w-full max-w-xs overflow-hidden rounded-xl bg-[#08090C]">
                <img src={draft.image_url.trim()} alt={`Prévia da arte de ${draft.game || "novo jogo"}`} className="h-full w-full object-contain" />
              </div>
              <div className="space-y-2">
                {imageInfo && <p className="text-xs font-semibold text-emerald-300">{imageInfo}</p>}
                {!isManagedReleaseImageUrl(draft.image_url) && (
                  <p className="max-w-sm text-xs leading-relaxed text-amber-200">
                    Esta é uma URL externa antiga. Importe a arte novamente antes de salvar.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void removeDraftImage()}
                  className="min-h-11 rounded-xl px-3 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/10"
                >
                  Remover arte
                </button>
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-11 items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} className="h-4 w-4 accent-orange-500" />
              Exibir no Radar
            </label>
            <button type="button" onClick={() => void saveDraft()} disabled={isSaving || isImporting} className="min-h-11 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50">
              {isSaving ? "Salvando…" : "Salvar no Radar"}
            </button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-white/[0.05]" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-white/[0.08] py-3 text-xs text-gray-400">
            <span>{imageStats.total} jogos organizados por mês e data</span>
            <span><strong className="text-emerald-300">{imageStats.withImage}</strong> com arte <span className="text-white/25">·</span> <strong className="text-amber-200">{imageStats.total - imageStats.withImage}</strong> sem arte</span>
          </div>
          {monthGroups.map((month) => (
            <details key={month.key} open={month.key !== "sem-data" && month.key >= currentMonthKey} className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-brand-orange transition-transform group-open:rotate-90">›</span>
                  <span className="truncate text-sm font-bold capitalize text-white">{month.label}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-gray-400">{month.items.length} {month.items.length === 1 ? "jogo" : "jogos"}</span>
              </summary>
              <div className="divide-y divide-white/[0.08] border-t border-white/[0.08] px-4">
          {month.items.map((item) => (
            <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center">
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-[#08090C] sm:w-32">
                {item.image_url?.trim() ? (
                  <img src={item.image_url.trim()} alt={`Arte promocional de ${item.game}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center px-3 text-center">
                    <span className="text-[10px] font-semibold text-amber-200/80">Sem arte</span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-white">{item.game}</h2>
                  {!item.is_active && <span className="text-[10px] font-bold uppercase text-gray-500">Oculto</span>}
                </div>
                <p className="mt-1 text-xs text-gray-400">{item.release_label} · {item.platforms.join(" · ")}</p>
                <p className="mt-1 truncate text-[10px] text-gray-600">{item.image_url || "Imagem ainda não importada"}</p>
              </div>
              <button type="button" onClick={() => void openDraft(toDraft(item))} className="min-h-11 w-full rounded-xl border border-white/10 px-4 text-sm font-semibold text-gray-200 hover:border-brand-orange/40 hover:text-white sm:w-auto">
                Editar
              </button>
            </article>
          ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
