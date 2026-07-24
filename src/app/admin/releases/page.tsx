"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/auth";
import { createDataClient } from "@/lib/supabase/client";
import { validateReleaseImageUrl } from "@/lib/release-images";
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

function inspectImage(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = document.createElement("img");
    const timeout = window.setTimeout(() => reject(new Error("A imagem demorou demais para carregar")), 15_000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("A URL não carregou uma imagem válida"));
    };
    image.src = url;
  });
}

export default function AdminReleasesPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [items, setItems] = useState<ReleaseRadarItem[]>([]);
  const [draft, setDraft] = useState<ReleaseDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

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

    setIsSaving(true);
    setError(null);
    try {
      let dimensions: { width: number; height: number } | null = null;
      if (draft.image_url.trim()) {
        const imageUrlError = validateReleaseImageUrl(draft.image_url);
        if (imageUrlError) throw new Error(imageUrlError);
        dimensions = await inspectImage(draft.image_url);
        if (dimensions.width < 1200 || dimensions.height < 675) {
          throw new Error(`Imagem pequena: ${dimensions.width} × ${dimensions.height}. Use no mínimo 1200 × 675.`);
        }
        const ratio = dimensions.width / dimensions.height;
        if (Math.abs(ratio - 16 / 9) > 0.12) {
          throw new Error(`Proporção incompatível: ${dimensions.width} × ${dimensions.height}. Use uma arte horizontal 16:9.`);
        }
      }

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
        updated_at: new Date().toISOString(),
      } satisfies ReleaseRadarItemInsert;
      const exists = items.some((item) => item.id === draft.id);
      const operation = exists
        ? supabase.from("release_radar_items").update(payload).eq("id", draft.id)
        : supabase.from("release_radar_items").insert(payload);
      const { error: saveError } = await operation;
      if (saveError) throw saveError;
      setImageInfo(dimensions ? `${dimensions.width} × ${dimensions.height} · 16:9 aprovado` : null);
      await loadItems();
      setDraft(null);
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
              setDraft({ ...EMPTY_DRAFT, sort_order: (items.at(-1)?.sort_order || 0) + 10 });
              setImageInfo(null);
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">{items.some((item) => item.id === draft.id) ? "Editar jogo" : "Novo jogo"}</h2>
            <button type="button" onClick={() => setDraft(null)} className="min-h-11 rounded-xl px-3 text-sm text-gray-400 hover:bg-white/5 hover:text-white">
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
            <label className="text-xs font-semibold text-gray-400 md:col-span-2 xl:col-span-4">
              URL da arte promocional 16:9
              <input type="url" value={draft.image_url} onChange={(event) => updateDraft("image_url", event.target.value)} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111218] px-3 font-mono text-xs text-white outline-none focus:border-brand-orange" />
              <span className="mt-1.5 block text-[11px] text-gray-500">Mínimo 1200 × 675. Recomendado 1920 × 1080. Miniaturas da Steam e do Google serão rejeitadas.</span>
            </label>
          </div>
          {draft.image_url && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="aspect-video w-full max-w-xs overflow-hidden rounded-xl bg-[#08090C]">
                <img src={draft.image_url} alt="" className="h-full w-full object-contain" />
              </div>
              <div>
                {imageInfo && <p className="mb-2 text-xs font-semibold text-emerald-300">{imageInfo}</p>}
                <label className="flex min-h-11 items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={draft.is_active} onChange={(event) => updateDraft("is_active", event.target.checked)} className="h-4 w-4 accent-orange-500" />
                  Exibir no Radar
                </label>
              </div>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => void saveDraft()} disabled={isSaving} className="min-h-11 rounded-xl bg-brand-orange px-5 text-sm font-bold text-white hover:bg-brand-orange/90 disabled:opacity-50">
              {isSaving ? "Validando e salvando…" : "Salvar no Radar"}
            </button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-white/[0.05]" />)}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {items.map((item) => (
            <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center">
              <div className="aspect-video w-32 overflow-hidden rounded-lg bg-[#08090C]">
                <img src={item.image_url || ""} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-white">{item.game}</h2>
                  {!item.is_active && <span className="text-[10px] font-bold uppercase text-gray-500">Oculto</span>}
                </div>
                <p className="mt-1 text-xs text-gray-400">{item.release_label} · {item.platforms.join(" · ")}</p>
                <p className="mt-1 truncate text-[10px] text-gray-600">{item.image_url}</p>
              </div>
              <button type="button" onClick={() => { setDraft(toDraft(item)); setImageInfo(null); }} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-gray-200 hover:border-brand-orange/40 hover:text-white">
                Editar
              </button>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
