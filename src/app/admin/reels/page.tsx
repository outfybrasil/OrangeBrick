"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Suspense, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { YouTubePublisher } from "@/components/admin/YouTubePublisher";
import { InstagramPublisher } from "@/components/admin/InstagramPublisher";
import { TikTokPublisher } from "@/components/admin/TikTokPublisher";
import { createDataClient } from "@/lib/supabase/client";
import { CATEGORY_CONFIG, type PostCategory } from "@/lib/types/database";
import type { AdminReelItem } from "@/app/api/admin/reels/route";
import type { ReelSocialPlatform, ReelSocialPublication, ReelSocialStatus } from "@/lib/video/reel-social-delivery";
import type { DarkPipelineConfig, LongVideoManifestItem, LongVideoVisualStyle } from "@/lib/video/reel-service";

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseTimestampToSeconds(ts: string) {
  const parts = ts.split(":").map((n) => Number.parseInt(n, 10));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatCountdown(seconds?: number) {
  if (seconds === undefined) return "calculando";
  const remaining = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const rest = remaining % 60;
  if (hours) return `${hours}h ${minutes}min`;
  if (minutes) return `${minutes}min ${rest}s`;
  return `${rest}s`;
}

function getElapsedSeconds(timestamp: string | undefined, now: number) {
  if (!timestamp) return undefined;
  const start = new Date(timestamp).getTime();
  return Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : undefined;
}

function getEstimatedRemainingSeconds(item: AdminReelItem, now: number) {
  if (item.estimated_remaining_seconds === undefined) return undefined;
  const updatedAt = item.eta_updated_at ? new Date(item.eta_updated_at).getTime() : now;
  const elapsed = Number.isFinite(updatedAt) ? Math.max(0, (now - updatedAt) / 1000) : 0;
  return Math.max(0, item.estimated_remaining_seconds - elapsed);
}

function isReelStalled(item: AdminReelItem, now: number) {
  const expected = item.expected_duration_seconds || 12 * 60;
  if (item.is_queued) {
    const queuedSeconds = getElapsedSeconds(item.queued_at, now);
    const expectedWait = expected * Math.max(1, item.queue_position || 1) + 10 * 60;
    return queuedSeconds !== undefined && queuedSeconds > Math.max(expectedWait, 30 * 60);
  }
  const elapsedSeconds = getElapsedSeconds(item.started_at, now);
  return elapsedSeconds !== undefined && elapsedSeconds > Math.max(expected * 2, 30 * 60);
}

const DARK_PRESET_THEMES = [
  {
    id: "gta6-market",
    label: "Pauta 3 · O Efeito GTA VI na Indústria (US$ 80, 210 GB e Calendário)",
    title: "O Efeito GTA VI na Indústria: Preço de US$ 80, Mídia Física sem Disco, 210 GB e o Terremoto no Mercado",
    subtitle: "Dossiê investigativo sobre precificação de US$ 80, rumores de lançamento digital, engenharia da RAGE 9 e o calendário de 19 de novembro de 2026.",
    keywords: ["gta-6", "gta-vi", "take-two", "rockstar"],
  },
  {
    id: "physical-media",
    label: "Pauta 1 · Mídia Física em Extinção (Game-Key Card, PS5 sem Disco e Preservação)",
    title: "A Morte Silenciosa da Mídia Física: Game-Key Cards, Consoles sem Leitor e o Futuro da Preservação",
    subtitle: "Como Nintendo, Sony e Microsoft redesenharam o mercado de jogos físicos e o que muda para colecionadores até 2028.",
    keywords: ["switch-2", "midia-fisica", "game-key", "playstation", "disco"],
  },
  {
    id: "console-wars-2027",
    label: "Pauta 2 · Guerra Fria dos Consoles 2026–2028 (Switch 2, PS6 e Novo Xbox)",
    title: "Guerra Fria do Hardware: O Xadrez Secreto entre Switch 2, PS6 e a Nova Geração do Xbox",
    subtitle: "Arquitetura, chips customizados, janela de lançamento e o impacto financeiro da transição de geração.",
    keywords: ["xbox", "ps6", "switch-2", "hardware", "amd", "nvidia"],
  },
];

function longStatusBadge(status: LongVideoManifestItem["status"]) {
  switch (status) {
    case "approved":
      return { label: "APROVADO", className: "bg-emerald-500 text-black border-emerald-400" };
    case "scheduled":
      return { label: "AGENDADO NO YOUTUBE", className: "bg-sky-400 text-black border-sky-300" };
    case "rejected":
      return { label: "REPROVADO · AJUSTAR", className: "bg-red-500 text-white border-red-400" };
    case "generating":
      return { label: "EM PRODUÇÃO", className: "bg-amber-400 text-black border-amber-300 animate-pulse" };
    default:
      return { label: "AGUARDANDO REVISÃO", className: "bg-brand-orange text-black border-brand-orange" };
  }
}

function InstagramMark({ id, published }: { id: string; published: boolean }) {
  const gradientId = `instagram-gradient-${id}`;
  const color = published ? `url(#${gradientId})` : "currentColor";

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.65" stopColor="#D62976" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill={color} />
    </svg>
  );
}

function TikTokMark({ published }: { published: boolean }) {
  const shape = "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.57 4.22 1.08 1.4 2.62 2.42 4.13 3.21.01 1.36 0 2.73-.01 4.09-1.7-.14-3.41-.77-4.9-1.71-.61-.38-1.18-.83-1.73-1.31-.04 2.86.02 5.71-.04 8.57-.09 1.37-.54 2.77-1.32 3.9-1.28 1.88-3.43 3.11-5.7 3.21-1.37.08-2.77-.21-3.99-.85-2.06-1.11-3.55-3.2-3.93-5.51-.42-2.38.27-4.96 1.85-6.87 1.76-1.85 4.38-2.79 6.92-2.33.02 1.54.05 3.08.03 4.62-1.04-.33-2.19-.25-3.14.26-.7.37-1.29.96-1.63 1.68-.29.59-.4 1.26-.32 1.91.13 1.29 1.07 2.47 2.32 2.85 1.01.31 2.19.02 2.94-.72.57-.55.86-1.37.86-2.16.02-4.11.03-8.22.03-12.33-.01-1.53-.03-3.07-.01-4.6-.01-1.53-.03-3.07-.01-4.6z";

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      {published ? (
        <>
          <path d={shape} transform="translate(-0.8 0.25)" fill="#25F4EE" />
          <path d={shape} transform="translate(0.8 -0.25)" fill="#FE2C55" />
        </>
      ) : null}
      <path d={shape} fill={published ? "#FFFFFF" : "currentColor"} />
    </svg>
  );
}

function YouTubeMark({ published }: { published: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z" fill={published ? "#FF0033" : "currentColor"} />
      <path d="m9.5 8.5 6.5 3.5-6.5 3.5v-7Z" fill={published ? "#FFFFFF" : "#0e1017"} />
    </svg>
  );
}

function SocialPublicationBadge({ platform, publication, id }: { platform: ReelSocialPlatform; publication?: ReelSocialPublication; id: string }) {
  const labels: Record<ReelSocialStatus | "idle", string> = {
    idle: "Não publicado",
    processing: "Publicando",
    submitted: "Aguardando",
    published: "Publicado",
    failed: "Falhou",
    unknown: "Conferir",
  };
  const status = publication?.status || "idle";
  const platformLabel = platform === "instagram" ? "Instagram" : platform === "tiktok" ? "TikTok" : "YouTube";
  const statusLabel = status === "submitted" && platform === "youtube" && publication?.visibility && publication.visibility !== "public" ? "Não público" : status === "submitted" && platform === "tiktok" && publication?.external_id?.startsWith("v_inbox_") ? "Finalizar no TikTok" : labels[status];
  const stateTextClass = status === "published" ? "text-emerald-300" : status === "failed" ? "text-red-300" : status === "processing" ? "text-amber-300" : "text-gray-400";

  return (
    <span
      className="inline-flex min-h-9 items-center gap-1.5 border border-white/10 px-2"
      aria-label={`${platformLabel}: ${statusLabel}`}
      title={publication?.error || `${platformLabel}: ${statusLabel}`}
    >
      <span className={status === "published" ? "text-white" : "text-gray-500"}>
        {platform === "instagram" ? <InstagramMark id={id} published={status === "published"} /> : platform === "tiktok" ? <TikTokMark published={status === "published"} /> : <YouTubeMark published={status === "published"} />}
      </span>
      <span className="text-xs font-semibold text-gray-300">{platformLabel}</span>
      {status === "processing" && <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />}
      <span className={`text-xs font-semibold ${stateTextClass}`}>{statusLabel}</span>
    </span>
  );
}

interface DarkPipelineStudioProps {
  items: AdminReelItem[];
  longVideos: LongVideoManifestItem[];
  darkConfig: DarkPipelineConfig | null;
  showCreatorDrawer: boolean;
  setShowCreatorDrawer: (next: boolean) => void;
  onUpdateLongVideo: (updated: LongVideoManifestItem) => void;
  onPrependLongVideo: (created: LongVideoManifestItem) => void;
  onDeleteLongVideo: (slug: string) => void;
  onOpenRelatedReel: (slug?: string) => void;
  showToast: (msg: string) => void;
}

function DarkPipelineStudio({
  items,
  longVideos,
  darkConfig,
  showCreatorDrawer,
  setShowCreatorDrawer,
  onUpdateLongVideo,
  onPrependLongVideo,
  onDeleteLongVideo,
  onOpenRelatedReel,
  showToast,
}: DarkPipelineStudioProps) {
  const supabase = useMemo(() => createDataClient(), []);
  const longVideoRef = useRef<HTMLVideoElement | null>(null);

  const [selectedLongSlug, setSelectedLongSlug] = useState<string>("");
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);
  const [isPlayingLongVideo, setIsPlayingLongVideo] = useState<boolean>(false);
  const [videoFallbackUrl, setVideoFallbackUrl] = useState<string | null>(null);
  const [thumbPreviewMode, setThumbPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [creatorScriptSource, setCreatorScriptSource] = useState<"ai_dossier" | "custom_script">("ai_dossier");
  const [creatorTitle, setCreatorTitle] = useState<string>("");
  const [creatorSubtitle, setCreatorSubtitle] = useState<string>("");
  const [creatorSelectedSlugs, setCreatorSelectedSlugs] = useState<string[]>([]);
  const [creatorPostFilter, setCreatorPostFilter] = useState<string>("");
  const [creatorManualScript, setCreatorManualScript] = useState<string>("");
  const [creatorStyle, setCreatorStyle] = useState<LongVideoVisualStyle>("documentario");
  const [creatorVoice, setCreatorVoice] = useState<string>("none");
  const [creatorTargetMinutes, setCreatorTargetMinutes] = useState<number>(10);
  const [isSubmittingDarkAction, setIsSubmittingDarkAction] = useState<boolean>(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");
  const [showRejectPrompt, setShowRejectPrompt] = useState<boolean>(false);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [reviewerNotesInput, setReviewerNotesInput] = useState<string>("");
  const [scheduleDateTime, setScheduleDateTime] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setHours(19, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [scheduleVisibility, setScheduleVisibility] = useState<"private" | "unlisted" | "public">("public");

  const activeLongVideo = useMemo(() => {
    return longVideos.find((v) => v.slug === selectedLongSlug) || longVideos[0] || null;
  }, [longVideos, selectedLongSlug]);

  const activeThumbnailOption = useMemo(() => {
    if (!activeLongVideo) return null;
    return (
      activeLongVideo.thumbnails?.find((t) => t.id === activeLongVideo.selected_thumbnail_id) ||
      activeLongVideo.thumbnails?.[0] ||
      null
    );
  }, [activeLongVideo]);

  const manualScriptStats = useMemo(() => {
    const words = creatorManualScript.trim() ? creatorManualScript.trim().split(/\s+/).length : 0;
    const estimatedSeconds = Math.round((words / 138) * 60);
    const reachesMidRoll = estimatedSeconds >= 480;
    return { words, estimatedSeconds, formattedDuration: formatTimestamp(estimatedSeconds), reachesMidRoll };
  }, [creatorManualScript]);

  const filteredCreatorPosts = useMemo(() => {
    const q = creatorPostFilter.trim().toLowerCase();
    if (!q) return items.slice(0, 18);
    return items.filter((post) => post.title.toLowerCase().includes(q) || post.slug.toLowerCase().includes(q)).slice(0, 18);
  }, [items, creatorPostFilter]);

  const copyText = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado para a área de transferência.`);
    } catch {
      showToast("Não foi possível copiar automaticamente.");
    }
  };

  const handleSelectPresetTheme = (presetId: string) => {
    const preset = DARK_PRESET_THEMES.find((p) => p.id === presetId);
    if (!preset) return;
    setCreatorTitle(preset.title);
    setCreatorSubtitle(preset.subtitle);
    const matching = items
      .filter((post) => preset.keywords.some((kw) => post.slug.toLowerCase().includes(kw) || post.title.toLowerCase().includes(kw)))
      .slice(0, 6)
      .map((post) => post.slug);
    if (matching.length > 0) {
      setCreatorSelectedSlugs(matching);
    }
  };

  const handleUploadScriptFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setCreatorManualScript(content);
      showToast(`Roteiro "${file.name}" importado com sucesso.`);
    } catch {
      showToast("Não foi possível ler o arquivo de texto.");
    }
  };

  const handleSeekChapter = (startSeconds: number, index: number) => {
    setActiveChapterIdx(index);
    const player = longVideoRef.current;
    if (!player) return;
    player.currentTime = startSeconds;
    void player.play().catch(() => undefined);
  };

  const handleTogglePlayLongVideo = () => {
    const player = longVideoRef.current;
    if (!player) return;
    if (player.paused) {
      void player.play().catch(() => undefined);
    } else {
      player.pause();
    }
  };

  const handleCreateLongEpisode = async () => {
    if (!creatorTitle.trim()) {
      showToast("Informe o título do episódio documental.");
      return;
    }
    if (creatorScriptSource === "custom_script" && manualScriptStats.words < 60) {
      showToast("Cole um roteiro com pelo menos 60 palavras para sintetizar o episódio.");
      return;
    }
    const defaultSlugs =
      creatorSelectedSlugs.length > 0
        ? creatorSelectedSlugs
        : items
            .filter((post) => DARK_PRESET_THEMES[0].keywords.some((kw) => post.slug.includes(kw)))
            .slice(0, 6)
            .map((post) => post.slug);

    setIsSubmittingDarkAction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "long",
          action: "create",
          title: creatorTitle.trim(),
          subtitle: creatorSubtitle.trim(),
          visual_style: creatorStyle,
          source_mode: creatorScriptSource,
          custom_script_text: creatorScriptSource === "custom_script" ? creatorManualScript : undefined,
          source_post_slugs: creatorScriptSource === "ai_dossier" ? defaultSlugs : [],
          target_min_minutes: creatorTargetMinutes,
          voice_id: creatorVoice,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.item) {
        throw new Error(result?.error || "Não foi possível iniciar a esteira de Vídeos Longos.");
      }

      onPrependLongVideo(result.item);
      setSelectedLongSlug(result.item.slug);
      setShowCreatorDrawer(false);
      showToast(result.message || "Episódio enviado para a esteira de Vídeos Longos!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao criar produção.");
    } finally {
      setIsSubmittingDarkAction(false);
    }
  };

  const handleReviewDecision = async (decision: "approve" | "reject", customThumbId?: string) => {
    if (!activeLongVideo) return;
    const notesToSave = decision === "reject" ? rejectionReasonInput.trim() : reviewerNotesInput.trim();
    if (decision === "reject" && !notesToSave) {
      showToast("Informe o motivo da reprovação para registrar na esteira.");
      return;
    }
    setIsSubmittingDarkAction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "long",
          action: "review",
          slug: activeLongVideo.slug,
          decision,
          review_notes: notesToSave || undefined,
          selected_thumbnail_id: customThumbId || activeLongVideo.selected_thumbnail_id,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.item) {
        throw new Error(result?.error || "Falha ao atualizar revisão do episódio.");
      }

      onUpdateLongVideo(result.item);
      setShowRejectPrompt(false);
      showToast(decision === "approve" ? "Episódio aprovado! Agendamento liberado." : "Episódio marcado para ajustes.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar decisão.");
    } finally {
      setIsSubmittingDarkAction(false);
    }
  };

  const handleSelectThumbnail = async (thumbId: string) => {
    if (!activeLongVideo) return;
    onUpdateLongVideo({ ...activeLongVideo, selected_thumbnail_id: thumbId });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const decision = activeLongVideo.status === "rejected" ? "reject" : "approve";
      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "long",
          action: "review",
          slug: activeLongVideo.slug,
          decision,
          selected_thumbnail_id: thumbId,
        }),
      });
      const result = await res.json().catch(() => null);
      if (result?.item) {
        onUpdateLongVideo(result.item);
      }
      showToast("Thumbnail principal selecionada.");
    } catch {
      showToast("Não foi possível salvar a thumbnail escolhida.");
    }
  };

  const handleScheduleLongVideo = async () => {
    if (!activeLongVideo) return;
    setIsSubmittingDarkAction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const isoDate = new Date(scheduleDateTime).toISOString();
      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "long",
          action: "schedule",
          slug: activeLongVideo.slug,
          scheduled_at: isoDate,
          visibility: scheduleVisibility,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.item) {
        throw new Error(result?.error || "Não foi possível agendar o episódio.");
      }

      onUpdateLongVideo(result.item);
      showToast("Episódio agendado no calendário do YouTube!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Falha ao agendar episódio.");
    } finally {
      setIsSubmittingDarkAction(false);
    }
  };

  const handleDeleteLongEpisode = async (slugToDelete: string) => {
    if (!slugToDelete) return;
    setIsSubmittingDarkAction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline: "long",
          action: "delete",
          slug: slugToDelete,
        }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || "Não foi possível excluir o episódio.");
      }

      onDeleteLongVideo(slugToDelete);
      setConfirmDeleteSlug(null);
      if (selectedLongSlug === slugToDelete) {
        setSelectedLongSlug("");
      }
      showToast("Episódio excluído com sucesso.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erro ao excluir episódio.");
    } finally {
      setIsSubmittingDarkAction(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b0d14] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-orange/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-orange">
              {darkConfig?.channel_name || "Orange Brick Docs"}
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Mid-Roll (&ge; 08:00)
            </span>
          </div>
          <h2 className="mt-1 font-heading text-lg font-black text-white">
            Produção & Revisão de Vídeos Longos (16:9 1080p)
          </h2>
          <p className="text-xs text-gray-400">
            Crie episódios com narração própria ou voz neural, revise as cenas e aprove antes de publicar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreatorDrawer(!showCreatorDrawer)}
          className={`flex min-h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
            showCreatorDrawer
              ? "border border-white/20 bg-white/10 text-white"
              : "bg-brand-orange text-black hover:bg-brand-orange/90"
          }`}
        >
          <span>{showCreatorDrawer ? "✕ Fechar Formulário" : "+ Criar Novo Vídeo Longo"}</span>
        </button>
      </div>

      {showCreatorDrawer && (
        <div className="rounded-3xl border border-brand-orange/40 bg-[#0e111a] p-3.5 sm:p-6 shadow-2xl">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="rounded-md bg-brand-orange/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-orange">
                Etapa 1 da Esteira · Entrada da Produção
              </span>
              <h3 className="mt-1 font-heading text-lg sm:text-xl font-black text-white">
                Iniciar Novo Episódio Documental (16:9 · 8 a 15 minutos)
              </h3>
              <p className="text-xs text-gray-400">
                Escolha entre pedir para a IA compilar um dossiê a partir das matérias do portal ou colar/subir seu próprio roteiro em texto.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-1 rounded-xl border border-white/10 bg-[#090b10] p-1 xs:grid-cols-2 sm:w-auto sm:flex">
              <button
                type="button"
                onClick={() => setCreatorScriptSource("ai_dossier")}
                className={`flex min-h-[38px] items-center justify-center rounded-lg px-3 py-1.5 text-center text-xs font-black uppercase transition-all ${
                  creatorScriptSource === "ai_dossier"
                    ? "bg-brand-orange text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                🤖 Pedir Roteiro à IA
              </button>
              <button
                type="button"
                onClick={() => setCreatorScriptSource("custom_script")}
                className={`flex min-h-[38px] items-center justify-center rounded-lg px-3 py-1.5 text-center text-xs font-black uppercase transition-all ${
                  creatorScriptSource === "custom_script"
                    ? "bg-brand-orange text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                📄 Usar Meu Roteiro (.TXT)
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              {creatorScriptSource === "ai_dossier" && (
                <div className="space-y-2">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                      Ideias Rápidas de Pauta (Opcional)
                    </label>
                    <span className="text-[11px] text-gray-500">Ou digite o tema que desejar abaixo</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {DARK_PRESET_THEMES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPresetTheme(preset.id)}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          creatorTitle === preset.title
                            ? "border-brand-orange bg-brand-orange/15 text-white ring-1 ring-brand-orange"
                            : "border-white/10 bg-[#141824] text-gray-300 hover:border-white/25"
                        }`}
                      >
                        <p className="line-clamp-1 text-xs font-black text-brand-orange">{preset.label.split("·")[1]?.trim() || preset.label}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{preset.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Título do Episódio no YouTube
                </label>
                <input
                  type="text"
                  value={creatorTitle}
                  onChange={(e) => setCreatorTitle(e.target.value)}
                  placeholder="Ex: O Efeito GTA VI na Indústria: Preço de US$ 80, 210 GB e o Terremoto no Mercado"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#141824] px-3.5 py-2.5 text-sm font-bold text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                  Subtítulo / Tese Central do Dossiê
                </label>
                <input
                  type="text"
                  value={creatorSubtitle}
                  onChange={(e) => setCreatorSubtitle(e.target.value)}
                  placeholder="Resumo da investigação e por que o tema importa para o público..."
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#141824] px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 focus:border-brand-orange focus:outline-none"
                />
              </div>

              {creatorScriptSource === "ai_dossier" ? (
                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Matérias-Fonte do Portal ({creatorSelectedSlugs.length} selecionadas)
                    </label>
                    <input
                      type="text"
                      value={creatorPostFilter}
                      onChange={(e) => setCreatorPostFilter(e.target.value)}
                      placeholder="Filtrar matérias..."
                      className="w-full xs:w-auto rounded-lg border border-white/10 bg-[#141824] px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-white/10 bg-[#090b10] p-2.5">
                    {filteredCreatorPosts.map((post) => {
                      const checked = creatorSelectedSlugs.includes(post.slug);
                      return (
                        <label
                          key={post.id}
                          className={`flex cursor-pointer items-start xs:items-center justify-between gap-2.5 rounded-lg border p-2 sm:px-3 sm:py-2 text-xs transition-colors ${
                            checked
                              ? "border-brand-orange/50 bg-brand-orange/10 text-white"
                              : "border-white/5 bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setCreatorSelectedSlugs((prev) =>
                                  checked ? prev.filter((s) => s !== post.slug) : [...prev, post.slug]
                                )
                              }
                              className="h-4 w-4 shrink-0 rounded accent-brand-orange"
                            />
                            <span className="truncate font-semibold">{post.title}</span>
                          </div>
                          <span className="shrink-0 text-[10px] text-gray-400">{formatDate(post.published_at || post.created_at)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                      Roteiro Completo em Texto Livre (separe blocos com linha em branco)
                    </label>
                    <label className="inline-flex min-h-[36px] cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white hover:bg-white/10">
                      📂 Importar arquivo .TXT
                      <input type="file" accept=".txt,.md" onChange={handleUploadScriptFile} className="hidden" />
                    </label>
                  </div>
                  <textarea
                    rows={8}
                    value={creatorManualScript}
                    onChange={(e) => setCreatorManualScript(e.target.value)}
                    placeholder={"Capítulo 1: O Choque dos US$ 80\nEscreva ou cole aqui os parágrafos da narração...\n\nCapítulo 2: O Mito dos 210 GB\nContinue os capítulos..."}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#090b10] p-3.5 font-mono text-xs leading-relaxed text-gray-200 placeholder-gray-600 focus:border-brand-orange focus:outline-none"
                  />
                  <div className="mt-2 flex flex-col xs:flex-row xs:items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#141824] p-3 text-xs">
                    <span className="text-gray-300">
                      Palavras: <strong className="text-white">{manualScriptStats.words}</strong> · Duração estimada de locução:{" "}
                      <strong className="text-white">{manualScriptStats.formattedDuration}</strong>
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-black uppercase ${
                        manualScriptStats.reachesMidRoll
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {manualScriptStats.reachesMidRoll
                        ? "✓ Atinge 8+ min (Mid-Roll Liberado)"
                        : "Recomendado: ~1.100 palavras para 8+ min"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121622] p-4 sm:p-5 lg:col-span-5">
              <div className="space-y-4">
                <h4 className="font-heading text-base font-black uppercase text-white">
                  Parâmetros da Fábrica Audiovisual
                </h4>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                    Direção Visual (16:9 1080p · 12 Estilos)
                  </label>
                  <select
                    value={creatorStyle}
                    onChange={(e) => setCreatorStyle(e.target.value as LongVideoVisualStyle)}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0b0d14] px-3.5 py-2.5 text-xs font-bold text-white focus:border-brand-orange focus:outline-none"
                  >
                    <option value="documentario">🎬 Documentário Investigativo (Ken Burns + Dossiê Split-Screen)</option>
                    <option value="cinema">🎞️ Ensaio Cinematográfico (Letterbox 2.35:1 + Atmosfera de Filme)</option>
                    <option value="arquivo-cofre">🗄️ Arquivo-Cofre (Provas Numeradas + Carimbos de Fonte)</option>
                    <option value="circuito">⚡ Circuito de Hardware (Especificações + Telemetria Técnica)</option>
                    <option value="tribunal">⚖️ Tribunal da Indústria (Tese vs. Contraponto em Tela Dividida)</option>
                    <option value="mesa-de-risco">📈 Mesa de Risco & Mercado (Gráficos Financeiros + Dados do Setor)</option>
                    <option value="turno-da-madrugada">🌙 Turno da Madrugada (Investigação Noir + Alto Contraste)</option>
                    <option value="linha-do-tempo">⏳ Linha do Tempo Histórica (Cronologia + Evolução de Franquia)</option>
                    <option value="raio-x">🔍 Raio-X de Gameplay & Engine (Decomposição de Mecânicas + HUD)</option>
                    <option value="duelo">⚔️ Duelo Comparativo (Lado a Lado: Consoles, Preços ou Gerações)</option>
                    <option value="manchete">📰 Manchete & Bastidores (Recortes de Imprensa + Declarações)</option>
                    <option value="impacto">💥 Impacto & Ruptura (Cortes Rápidos + Dados em Destaque)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Narrador / Locução
                    </label>
                    <select
                      value={creatorVoice}
                      onChange={(e) => setCreatorVoice(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0b0d14] px-3 py-2.5 text-xs font-bold text-white focus:border-brand-orange focus:outline-none"
                    >
                      <option value="none">🔇 Sem Narrador (Gravar Minha Voz por Cima)</option>
                      <option value="pt-BR-AntonioNeural">🎙️ Antonio Neural (Grave Documental)</option>
                      <option value="pt-BR-FranciscaNeural">🎙️ Francisca Neural (Editorial Ágil)</option>
                      <option value="pt-BR-ThalitaNeural">🎙️ Thalita Neural (Narrativa Dinâmica)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
                      Meta de Duração (Mid-Roll)
                    </label>
                    <select
                      value={creatorTargetMinutes}
                      onChange={(e) => setCreatorTargetMinutes(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0b0d14] px-3 py-2.5 text-xs font-bold text-white focus:border-brand-orange focus:outline-none"
                    >
                      <option value={8}>⏱️ 08 min (Mínimo Mid-Roll)</option>
                      <option value={10}>⏱️ 10 min (Ideal Retenção)</option>
                      <option value={12}>⏱️ 12 min (Dossiê Profundo)</option>
                      <option value={15}>⏱️ 15 min (Especial Completo)</option>
                    </select>
                  </div>
                </div>

                {creatorVoice === "none" && (
                  <div className="rounded-xl border border-brand-orange/40 bg-brand-orange/10 p-3 text-xs text-amber-200">
                    <p className="font-black uppercase text-brand-orange">🎤 Modo Gravação de Voz Própria Ativo</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-200">
                      O vídeo será gerado sem voz de IA, mantendo apenas a trilha ambiente suave e o ritmo de leitura natural (135 palavras/min) com legendas sincronizadas na tela e arquivo .SRT para servir de teleprompter quando você gravar seu áudio por cima.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-[#0b0d14] p-3.5 text-xs text-gray-300 space-y-1.5">
                  <p className="font-bold text-white">O que a esteira entrega automaticamente:</p>
                  <p>✓ Vídeo 1920×1080 H.264 30fps com lower thirds e barra de capítulos</p>
                  <p>✓ Áudio masterizado com trilha ambiente ducked (-14 LUFS) + arquivo .SRT</p>
                  <p>✓ 3 opções de Thumbnail 1280×720 com teste de leitura no celular</p>
                  <p>✓ Kit YouTube completo + 3 sugestões de cortes verticais (Shorts)</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatorDrawer(false)}
                  className="flex min-h-[42px] items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-gray-300 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDarkAction}
                  onClick={handleCreateLongEpisode}
                  className="flex min-h-[42px] items-center justify-center rounded-xl bg-brand-orange px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-60"
                >
                  {isSubmittingDarkAction ? "Gerando Vídeo..." : "🚀 Iniciar Produção do Vídeo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Episódios em Produção / Revisão ({longVideos.length})
          </p>
          <span className="text-[11px] text-gray-500">Selecione para assistir e aprovar</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        {longVideos.map((video) => {
          const badge = longStatusBadge(video.status);
          const isSelected = activeLongVideo?.slug === video.slug;
          const isConfirmingCardDelete = confirmDeleteSlug === video.slug;
          return (
            <div
              key={video.slug}
              className={`flex flex-col xs:flex-row xs:items-center w-full sm:min-w-[280px] sm:flex-1 justify-between gap-3 rounded-2xl border p-3 sm:p-3.5 text-left transition-all ${
                isSelected
                  ? "border-brand-orange bg-[#141824] shadow-xl"
                  : "border-white/10 bg-[#0e1017] hover:border-white/25"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedLongSlug(video.slug);
                  setActiveChapterIdx(0);
                  setVideoFallbackUrl(null);
                  setIsPlayingLongVideo(false);
                }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400">
                    ⏱️ {video.duration_formatted} {video.monetization_midroll_eligible ? "· Mid-Roll Ativo" : ""}
                  </span>
                </div>
                <p className="mt-1.5 truncate font-heading text-sm font-black text-white">
                  {video.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {video.chapters?.length || 8} capítulos · {formatBytes(video.file_size)} · {video.resolution}
                </p>
              </button>

              <div className="flex shrink-0 items-center justify-between xs:justify-end gap-2 border-t border-white/5 pt-2 xs:border-t-0 xs:pt-0">
                {isConfirmingCardDelete ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmittingDarkAction}
                      onClick={() => void handleDeleteLongEpisode(video.slug)}
                      className="rounded-lg bg-red-500 px-2.5 py-1.5 text-[11px] font-black uppercase text-white hover:bg-red-400 disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSlug(null)}
                      className="rounded-lg border border-white/15 px-2 py-1.5 text-[11px] font-bold text-gray-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLongSlug(video.slug);
                        setActiveChapterIdx(0);
                        setVideoFallbackUrl(null);
                        setIsPlayingLongVideo(false);
                      }}
                      className="text-xs font-bold text-brand-orange"
                    >
                      {isSelected ? "Em tela ●" : "Abrir →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSlug(video.slug)}
                      title="Apagar este vídeo longo"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition-colors hover:bg-red-500/25 hover:text-red-200"
                    >
                      🗑️ Apagar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {activeLongVideo ? (
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-[#0b0d14] shadow-2xl">
              <div className="relative aspect-video w-full bg-black">
                {activeLongVideo.video_url ? (
                  <video
                    ref={longVideoRef}
                    key={videoFallbackUrl || activeLongVideo.video_url}
                    src={videoFallbackUrl || activeLongVideo.video_url}
                    poster={activeThumbnailOption?.url || activeLongVideo.preview_sheet_url}
                    controls
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsPlayingLongVideo(true)}
                    onPause={() => setIsPlayingLongVideo(false)}
                    onEnded={() => setIsPlayingLongVideo(false)}
                    onError={() => {
                      const localPath = `/long-videos/${activeLongVideo.slug}/${activeLongVideo.slug}.mp4`;
                      if (!videoFallbackUrl && activeLongVideo.video_url !== localPath) {
                        setVideoFallbackUrl(localPath);
                      }
                    }}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
                    <p className="mt-3 font-heading text-base font-black text-white">
                      {activeLongVideo.pipeline_stage_label || "Renderizando Episódio 16:9 na Esteira..."}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      A síntese neural e a composição de cenas estão em execução em segundo plano.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 bg-[#10131d] p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                  {activeLongVideo.video_url && (
                    <button
                      type="button"
                      onClick={handleTogglePlayLongVideo}
                      className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-black uppercase text-black transition-colors hover:bg-emerald-400"
                    >
                      {isPlayingLongVideo ? "⏸ Pausar Vídeo" : "▶ Reproduzir Vídeo"}
                    </button>
                  )}
                  <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 font-black text-emerald-300">
                    {activeLongVideo.duration_formatted} ({Math.round(activeLongVideo.duration_seconds)}s)
                  </span>
                  <span className="rounded-md bg-white/5 px-2.5 py-1 font-semibold text-gray-300">
                    {activeLongVideo.resolution} · {activeLongVideo.fps}fps
                  </span>
                  <span className="rounded-md bg-white/5 px-2.5 py-1 font-semibold text-gray-300">
                    {formatBytes(activeLongVideo.file_size)}
                  </span>
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-3 gap-1.5 w-full sm:flex sm:w-auto sm:items-center sm:gap-2">
                  {activeLongVideo.video_url && (
                    <a
                      href={activeLongVideo.video_url}
                      download
                      className="flex min-h-[36px] items-center justify-center rounded-lg bg-brand-orange px-3 py-1.5 text-center text-[11px] sm:text-xs font-black uppercase text-black hover:bg-brand-orange/90"
                    >
                      ⬇ Baixar .MP4
                    </a>
                  )}
                  {activeLongVideo.srt_url && (
                    <a
                      href={activeLongVideo.srt_url}
                      download
                      className="flex min-h-[36px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold text-gray-200 hover:bg-white/10"
                    >
                      ⬇ Legendas .SRT
                    </a>
                  )}
                  {activeLongVideo.preview_sheet_url && (
                    <a
                      href={activeLongVideo.preview_sheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[36px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold text-gray-200 hover:bg-white/10"
                    >
                      🖼️ Folha Cenas
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0e1017] p-3.5 sm:p-5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                    Etapa 5 · Teste de Clique (CTR) e Legibilidade
                  </span>
                  <h3 className="font-heading text-base sm:text-lg font-black text-white">
                    3 Opções de Thumbnail + Simulador Desktop vs. Celular
                  </h3>
                </div>

                <div className="grid w-full grid-cols-1 gap-1 rounded-xl border border-white/10 bg-[#090b10] p-1 xs:grid-cols-2 sm:w-auto sm:flex">
                  <button
                    type="button"
                    onClick={() => setThumbPreviewMode("desktop")}
                    className={`flex min-h-[36px] items-center justify-center rounded-lg px-3 py-1.5 text-center text-xs font-bold transition-all ${
                      thumbPreviewMode === "desktop" ? "bg-white text-black" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🖥️ Vista Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbPreviewMode("mobile")}
                    className={`flex min-h-[36px] items-center justify-center rounded-lg px-3 py-1.5 text-center text-xs font-bold transition-all ${
                      thumbPreviewMode === "mobile" ? "bg-brand-orange text-black font-black" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    📱 Feed Celular (168×94)
                  </button>
                </div>
              </div>

              {thumbPreviewMode === "mobile" && activeThumbnailOption && (
                <div className="mt-4 rounded-2xl border border-brand-orange/30 bg-[#090b10] p-3.5 sm:p-4">
                  <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-orange">
                    Simulação Realista: Feed do YouTube no Celular (Teste dos 3 Segundos)
                  </p>
                  <div className="flex flex-col xs:flex-row items-start gap-3">
                    <div className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black">
                      <img
                        src={activeThumbnailOption.url}
                        alt={activeThumbnailOption.label}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-black/90 px-1 py-0.5 font-mono text-[10px] font-bold text-white">
                        {activeLongVideo.duration_formatted}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-white">
                        {activeLongVideo.youtube?.title || activeLongVideo.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Orange Brick Docs · 42 mil visualizações · há 2 horas
                      </p>
                      <span className="mt-2 inline-block rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ Manchete curta ({activeThumbnailOption.headline}) legível em tela pequena
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(activeLongVideo.thumbnails || []).map((thumb) => {
                  const isSelected = (activeLongVideo.selected_thumbnail_id || "thumb_1") === thumb.id;
                  return (
                    <button
                      key={thumb.id}
                      type="button"
                      onClick={() => void handleSelectThumbnail(thumb.id)}
                      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-brand-orange bg-brand-orange/10 ring-2 ring-brand-orange/40"
                          : "border-white/10 bg-[#131622] hover:border-white/25"
                      }`}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        <img
                          src={thumb.url}
                          alt={thumb.label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span
                          className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                            isSelected ? "bg-brand-orange text-black" : "bg-black/75 text-white"
                          }`}
                        >
                          {isSelected ? "✓ Capa Ativa" : "Selecionar"}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-black text-white">{thumb.label}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{thumb.angle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0e1017] p-3.5 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                    Etapas 2, 3 e 4 · Navegação Interativa por Capítulos
                  </span>
                  <h3 className="font-heading text-base sm:text-lg font-black text-white">
                    Roteiro Sincronizado & Fontes Primárias ({activeLongVideo.chapters?.length || 0} Capítulos)
                  </h3>
                </div>
                <span className="text-[11px] sm:text-xs text-gray-400">Clique para pular no vídeo</span>
              </div>

              <div className="mt-4 space-y-2">
                {(activeLongVideo.chapters || []).map((chapter, idx) => {
                  const isCurrent = activeChapterIdx === idx;
                  return (
                    <button
                      key={chapter.number}
                      type="button"
                      onClick={() => handleSeekChapter(chapter.start_seconds, idx)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:px-3.5 sm:py-2.5 text-left transition-all ${
                        isCurrent
                          ? "border-brand-orange bg-brand-orange/15 text-white"
                          : "border-white/10 bg-[#131622] text-gray-300 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="shrink-0 rounded-lg bg-black/60 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-extrabold text-brand-orange">
                          {chapter.timestamp}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-white">
                            Cap. {chapter.number} — {chapter.title}
                          </p>
                          <p className="truncate text-[10px] sm:text-[11px] text-gray-400">
                            Fonte: <strong className="text-gray-200">{chapter.source || "Apuração Orange Brick"}</strong>
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] sm:text-[11px] font-semibold text-brand-orange">
                        Pular ▶
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <div className="rounded-3xl border border-brand-orange/40 bg-[#10131e] p-3.5 sm:p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-brand-orange/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-orange">
                  Etapa 7 · Portão de Revisão Humana
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${longStatusBadge(activeLongVideo.status).className}`}>
                  {longStatusBadge(activeLongVideo.status).label}
                </span>
              </div>

              <h3 className="mt-2 font-heading text-lg sm:text-xl font-black text-white">
                Nada vai ao ar sem você aprovar
              </h3>
              <p className="mt-1 text-xs text-gray-300">
                Confira o player 16:9, a pronúncia da locução, a thumbnail escolhida e as 6 travas de qualidade abaixo antes de liberar o agendamento no YouTube.
              </p>

              {activeLongVideo.review_notes && activeLongVideo.status === "rejected" && (
                <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">
                  <p className="font-bold uppercase">Motivo da Reprovação Registrado:</p>
                  <p className="mt-0.5">{activeLongVideo.review_notes}</p>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Notas do Revisor Editorial (Opcional)
                </label>
                <input
                  type="text"
                  value={reviewerNotesInput}
                  onChange={(e) => setReviewerNotesInput(e.target.value)}
                  placeholder="Ex: Áudio revisado, capa 1 aprovada para publicação às 19h..."
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#090b10] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2.5">
                <button
                  type="button"
                  disabled={isSubmittingDarkAction}
                  onClick={() => void handleReviewDecision("approve")}
                  className="flex min-h-[44px] items-center justify-center flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-all hover:bg-emerald-400 disabled:opacity-60"
                >
                  ✓ Aprovar Episódio para o Canal
                </button>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmittingDarkAction}
                    onClick={() => setShowRejectPrompt((prev) => !prev)}
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-300 transition-all hover:bg-red-500/25"
                  >
                    ✕ Reprovar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingDarkAction}
                    onClick={() =>
                      setConfirmDeleteSlug((prev) => (prev === activeLongVideo.slug ? null : activeLongVideo.slug))
                    }
                    className="flex min-h-[44px] items-center justify-center rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-200 transition-all hover:bg-red-900/40"
                  >
                    🗑️ Apagar
                  </button>
                </div>
              </div>

              {confirmDeleteSlug === activeLongVideo.slug && (
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-red-500/40 bg-[#090b10] p-3 sm:p-3.5">
                  <p className="text-xs font-bold text-red-300">
                    Tem certeza que deseja apagar permanentemente &ldquo;{activeLongVideo.title}&rdquo;?
                  </p>
                  <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSlug(null)}
                      className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingDarkAction}
                      onClick={() => void handleDeleteLongEpisode(activeLongVideo.slug)}
                      className="min-h-[36px] rounded-lg bg-red-500 px-3.5 py-1.5 text-xs font-black uppercase text-white hover:bg-red-400 disabled:opacity-60"
                    >
                      Confirmar Exclusão
                    </button>
                  </div>
                </div>
              )}

              {showRejectPrompt && (
                <div className="mt-3 space-y-2 rounded-2xl border border-red-500/30 bg-[#090b10] p-3 sm:p-3.5">
                  <label className="block text-xs font-bold text-red-300">
                    Qual ajuste precisa ser refeito na esteira?
                  </label>
                  <input
                    type="text"
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="Ex: Ajustar pronúncia no Cap. 3 ou trocar imagem da Cena B..."
                    className="w-full rounded-lg border border-white/15 bg-[#121521] px-3 py-2 text-xs text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectPrompt(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewDecision("reject")}
                      className="rounded-lg bg-red-500 px-3.5 py-1.5 text-xs font-black uppercase text-white"
                    >
                      Confirmar Reprovação
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0e1017] p-3.5 sm:p-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                Etapa 6 · Checagens Automáticas de Qualidade (QA Gate)
              </span>
              <h3 className="mt-0.5 font-heading text-base font-black text-white">
                6 Travas Técnicas & Editoriais Verificadas
              </h3>

              <div className="mt-3 space-y-2">
                {(activeLongVideo.qa_checks || []).map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#131622] p-3"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-white">{check.label}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">{check.detail}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                        check.passed
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {check.passed ? "APROVADO" : "ATENÇÃO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0e1017] p-3.5 sm:p-5 space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                  Etapa 8 · Agendamento YouTube & Kit de Publicação
                </span>
                <h3 className="mt-0.5 font-heading text-base font-black text-white">
                  Calendário do Canal & Metadados Otimizados
                </h3>
              </div>

              {activeLongVideo.youtube?.scheduled_at && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 text-xs text-sky-200">
                  📅 Agendado para: <strong>{formatDate(activeLongVideo.youtube.scheduled_at)}</strong> ({activeLongVideo.youtube.visibility || "public"})
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">
                    Data e Hora de Estreia
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#131622] px-3 py-2 text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">
                    Visibilidade no YouTube
                  </label>
                  <select
                    value={scheduleVisibility}
                    onChange={(e) => setScheduleVisibility(e.target.value as typeof scheduleVisibility)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#131622] px-3 py-2 text-xs font-bold text-white"
                  >
                    <option value="public">🌍 Público (Estreia Imediata na Hora)</option>
                    <option value="unlisted">🔗 Não Listado (Revisão Externa)</option>
                    <option value="private">🔒 Privado</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmittingDarkAction}
                onClick={() => void handleScheduleLongVideo()}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-gray-200 disabled:opacity-60"
              >
                📅 Confirmar Agendamento no YouTube
              </button>

              {activeLongVideo.youtube && (
                <div className="space-y-2.5 border-t border-white/10 pt-4">
                  <div className="rounded-xl border border-white/10 bg-[#131622] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-gray-400">Título YouTube (CTR)</span>
                      <button
                        type="button"
                        onClick={() => void copyText("Título", activeLongVideo.youtube.title)}
                        className="text-xs font-bold text-brand-orange hover:underline"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="mt-1 text-xs font-bold text-white">{activeLongVideo.youtube.title}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#131622] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-gray-400">
                        Descrição com Capítulos (00:00) e Fontes
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyText("Descrição", activeLongVideo.youtube.description)}
                        className="text-xs font-bold text-brand-orange hover:underline"
                      >
                        Copiar
                      </button>
                    </div>
                    <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-gray-300">
                      {activeLongVideo.youtube.description}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void copyText("Tags SEO", activeLongVideo.youtube.tags.join(", "))}
                      className="flex min-h-[38px] items-center justify-center rounded-xl border border-white/10 bg-[#131622] px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/10"
                    >
                      🏷️ Copiar {activeLongVideo.youtube.tags.length} Tags SEO
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText("Comentário Fixado", activeLongVideo.youtube.pinned_comment)}
                      className="flex min-h-[38px] items-center justify-center rounded-xl border border-white/10 bg-[#131622] px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/10"
                    >
                      💬 Copiar Comentário
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0e1017] p-3.5 sm:p-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange">
                Distribuição Cruzada · Funil de Tráfego Orgânico
              </span>
              <h3 className="mt-0.5 font-heading text-base font-black text-white">
                3 Cortes Verticais Sugeridos (Shorts / Reels / TikTok)
              </h3>
              <p className="mt-0.5 text-xs text-gray-400">
                Momentos de pico do episódio longo mapeados para vídeos curtos de 50s que empurram audiência para o vídeo de 12 minutos.
              </p>

              <div className="mt-3 space-y-2.5">
                {(activeLongVideo.shorts_suggestions || []).map((cut) => (
                  <div
                    key={cut.id}
                    className="rounded-xl border border-white/10 bg-[#131622] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-white">{cut.title}</span>
                      <span className="rounded bg-brand-orange/20 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-orange">
                        {cut.start_timestamp} → {cut.end_timestamp} ({cut.duration_seconds}s)
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-300">
                      Gancho: &ldquo;{cut.hook}&rdquo;
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          handleSeekChapter(
                            parseTimestampToSeconds(cut.start_timestamp),
                            Math.max(0, Number.parseInt(cut.chapter_number, 10) - 1)
                          )
                        }
                        className="text-[11px] font-bold text-gray-400 hover:text-white"
                      >
                        ▶ Ouvir trecho no player
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenRelatedReel(cut.related_slug)}
                        className="text-[11px] font-extrabold text-brand-orange hover:underline"
                      >
                        Abrir nos Reels 9:16 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
          <p className="font-heading text-lg font-black text-white">Nenhum episódio longo carregado</p>
          <p className="mt-1 text-xs text-gray-400">
            Clique em &ldquo;+ Novo Vídeo Longo&rdquo; acima para disparar a esteira de 8 etapas.
          </p>
        </div>
      )}
    </div>
  );
}

function AdminReelsContent({ defaultMode = "short" }: { defaultMode?: "short" | "long" }) {
  const supabase = useMemo(() => createDataClient(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedPost = searchParams.get("postId");
  const modeParam = searchParams.get("mode");
  const openedRequestedPost = useRef<string | null>(null);

  const [items, setItems] = useState<AdminReelItem[]>([]);
  const [longVideos, setLongVideos] = useState<LongVideoManifestItem[]>([]);
  const [darkConfig, setDarkConfig] = useState<DarkPipelineConfig | null>(null);
  const [showCreatorDrawer, setShowCreatorDrawer] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "generating" | "pending">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedReel, setSelectedReel] = useState<AdminReelItem | null>(null);
  const [activeTab, setActiveTab] = useState<"instagram" | "tiktok" | "youtube">("youtube");
  const [triggeringSlug, setTriggeringSlug] = useState<string | null>(null);
  const [cancellingSlug, setCancellingSlug] = useState<string | null>(null);
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const hasGeneratingReel = items.some((item) => item.status === "generating") || triggeringSlug !== null;

  const pipelineMode: "short" | "long" = modeParam === "long" ? "long" : modeParam === "short" ? "short" : defaultMode;

  const switchMode = useCallback((nextMode: "short" | "long") => {
    const url = nextMode === "long" ? "/admin/videos-longos" : "/admin/reels";
    router.replace(url, { scroll: false });
  }, [router]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage((c) => (c === msg ? null : c)), 3500);
  }, []);

  const downloadReel = useCallback(async (item: AdminReelItem) => {
    setDownloadingSlug(item.slug);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const response = await fetch(`/api/admin/reels/download?id=${encodeURIComponent(item.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: unknown } | null;
        throw new Error(typeof result?.error === "string" ? result.error : "Não foi possível baixar o Reel.");
      }

      const video = await response.blob();
      if (!video.size) throw new Error("O arquivo do Reel está vazio.");

      const objectUrl = URL.createObjectURL(video);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${item.slug}.mp4`;
      link.style.display = "none";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      showToast("Download do Reel iniciado.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Não foi possível baixar o Reel.");
    } finally {
      setDownloadingSlug(null);
    }
  }, [showToast, supabase]);

  const loadReels = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/admin/reels", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Falha ao carregar lista de reels");
      }

      const data = await res.json();
      setItems(data.items || []);
      setLongVideos(data.longVideos || []);
      setDarkConfig(data.darkConfig || null);
      setSelectedReel((current) => current ? data.items?.find((item: AdminReelItem) => item.slug === current.slug) || current : null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com o servidor.");
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [supabase]);

  const refreshReelsSilently = useCallback(() => { void loadReels(true); }, [loadReels]);

  const updateSocialPublication = useCallback((postId: string, platform: "instagram" | "tiktok", status: ReelSocialStatus, error: string | null = null, externalId: string | null = null) => {
    const updateItem = (item: AdminReelItem): AdminReelItem => ({
      ...item,
      socialPublications: {
        ...item.socialPublications,
        [platform]: {
          platform,
          status,
          external_id: externalId ?? item.socialPublications[platform]?.external_id ?? null,
          error,
          updated_at: new Date().toISOString(),
        },
      },
    });

    setItems((current) => current.map((item) => item.id === postId ? updateItem(item) : item));
    setSelectedReel((current) => current?.id === postId ? updateItem(current) : current);
    if (status !== "processing") void loadReels(true);
  }, [loadReels]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReels(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReels]);

  useEffect(() => {
    if (!requestedPost) { openedRequestedPost.current = null; return; }
    if (openedRequestedPost.current === requestedPost) return;
    const item = items.find(item => item.id === requestedPost);
    if (!item) return;
    openedRequestedPost.current = requestedPost;
    queueMicrotask(() => { setSelectedReel(item); setActiveTab("youtube"); });
  }, [items, requestedPost]);

  useEffect(() => {
    const hasGenerating = items.some((i) => i.status === "generating") || longVideos.some((v) => v.status === "generating");
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadReels(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [items, longVideos, loadReels]);

  useEffect(() => {
    if (!hasGeneratingReel) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hasGeneratingReel]);

  useEffect(() => {
    const hasSocialActivity = items.some((item) => Object.values(item.socialPublications).some((publication) => publication?.status === "processing" || publication?.status === "submitted" && !(publication.platform === "tiktok" && publication.external_id?.startsWith("v_inbox_")) && !(publication.platform === "youtube" && publication.visibility && publication.visibility !== "public")));
    if (!hasSocialActivity) return;

    const interval = window.setInterval(() => void loadReels(true), 10_000);
    return () => window.clearInterval(interval);
  }, [items, loadReels]);

  const handleGenerate = async (slug: string) => {
    setTriggeringSlug(slug);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(30_000),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok || result?.queued !== true) {
        throw new Error(result?.error || result?.message || "O servidor não confirmou o início da geração. Atualize a lista antes de tentar novamente.");
      }

      showToast(result.message || "Geração solicitada. Acompanhe o andamento na lista.");
      const queuedAt = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) =>
          item.slug === slug ? {
            ...item,
            status: "generating",
            is_queued: true,
            queue_position: 1,
            queued_at: queuedAt,
            expected_duration_seconds: 12 * 60,
            estimated_remaining_seconds: 12 * 60,
            eta_updated_at: queuedAt,
          } : item
        )
      );
      setSelectedReel((current) => current?.slug === slug ? {
        ...current,
        status: "generating",
        is_queued: true,
        queue_position: 1,
        queued_at: queuedAt,
        expected_duration_seconds: 12 * 60,
        estimated_remaining_seconds: 12 * 60,
        eta_updated_at: queuedAt,
      } : current);
    } catch (err: unknown) {
      const message = err instanceof Error && err.name === "TimeoutError"
        ? "O servidor demorou para confirmar a geração. Atualize a lista antes de tentar novamente."
        : err instanceof TypeError && /fetch|network/i.test(err.message)
          ? "Não foi possível conectar ao servidor de Reels. Atualize a lista antes de tentar novamente para conferir se a solicitação foi recebida."
        : err instanceof Error ? err.message : "Não foi possível iniciar a geração.";
      setError(message);
      showToast(message);
    } finally {
      setTriggeringSlug(null);
    }
  };

  const handleCancel = async (slug: string) => {
    setCancellingSlug(slug);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await fetch("/api/admin/reels", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || result?.message || "Não foi possível cancelar a geração.");
      }

      showToast(result.message || "Geração cancelada com sucesso!");
      setItems((prev) =>
        prev.map((item) =>
          item.slug === slug ? { ...item, status: "failed", error: "Geração cancelada pelo usuário." } : item
        )
      );
      setSelectedReel((current) => current?.slug === slug ? { ...current, status: "failed", error: "Geração cancelada pelo usuário." } : current);
      void loadReels(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Não foi possível cancelar a geração.";
      setError(message);
      showToast(message);
    } finally {
      setCancellingSlug(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "ready" && item.status === "ready") ||
        (statusFilter === "generating" && item.status === "generating") ||
        (statusFilter === "pending" && (item.status === "pending" || item.status === "failed"));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const ready = items.filter((i) => i.status === "ready").length;
    const generating = items.filter((i) => i.status === "generating").length;
    const pending = total - ready - generating;
    return { total, ready, generating, pending };
  }, [items]);

  return (
    <AdminShell
      active="reels"
      title={pipelineMode === "long" ? "Vídeos Longos · Documentários 16:9" : "Central de Reels & Vídeos"}
      description={
        pipelineMode === "long"
          ? "Esteira automatizada em 8 etapas: pauta ou roteiro próprio, narração neural PT-BR, cenas 16:9 em 1080p, 3 thumbnails, trava QA e revisão humana antes de agendar no YouTube."
          : "Gerencie vídeos verticais (1080×1920) em motion graphics com narração neural. Cada notícia publicada gera seu vídeo automaticamente."
      }
      wide
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {pipelineMode === "long" && (
            <button
              type="button"
              onClick={() => setShowCreatorDrawer((prev) => !prev)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-orange px-3.5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-brand-orange/90"
            >
              <span>{showCreatorDrawer ? "Fechar Fábrica" : "+ Novo Vídeo Longo"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => loadReels()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      }
    >
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border border-brand-orange/40 bg-[#12141c] px-4 py-3 text-sm font-bold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mb-4 sm:mb-6 flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-[#0b0d14] p-1.5 sm:p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5 w-full sm:flex sm:w-auto">
          <button
            type="button"
            onClick={() => switchMode("long")}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
              pipelineMode === "long"
                ? "bg-brand-orange text-black shadow-lg shadow-brand-orange/20"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>🎬 Vídeos Longos (16:9)</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${pipelineMode === "long" ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"}`}>
              {longVideos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchMode("short")}
            className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all ${
              pipelineMode === "short"
                ? "bg-white text-black shadow-lg"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span>📱 Reels & Shorts (9:16)</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${pipelineMode === "short" ? "bg-black/15 text-black" : "bg-white/10 text-gray-300"}`}>
              {stats.ready}/{stats.total}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-1 text-[11px] sm:text-xs text-gray-400">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            Trava Humana Ativa: Nada vai ao ar sem aprovação
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          <p className="font-bold">Aviso:</p>
          <p>{error}</p>
        </div>
      )}

      {pipelineMode === "long" ? (
        <DarkPipelineStudio
          items={items}
          longVideos={longVideos}
          darkConfig={darkConfig}
          showCreatorDrawer={showCreatorDrawer}
          setShowCreatorDrawer={setShowCreatorDrawer}
          onUpdateLongVideo={(updated) =>
            setLongVideos((prev) =>
              prev.map((entry) =>
                entry.slug === updated.slug
                  ? {
                      ...updated,
                      video_url:
                        updated.video_url?.startsWith("http") || !entry.video_url?.startsWith("http")
                          ? updated.video_url
                          : entry.video_url,
                    }
                  : entry
              )
            )
          }
          onPrependLongVideo={(created) =>
            setLongVideos((prev) => [created, ...prev.filter((entry) => entry.slug !== created.slug)])
          }
          onDeleteLongVideo={(deletedSlug) =>
            setLongVideos((prev) => prev.filter((entry) => entry.slug !== deletedSlug))
          }
          onOpenRelatedReel={(slug) => {
            const targetReel = items.find((i) => i.slug === slug);
            switchMode("short");
            if (targetReel) {
              setSelectedReel(targetReel);
            }
          }}
          showToast={showToast}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#0e1017] p-4.5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total de Matérias</p>
              <p className="mt-1 font-heading text-3xl font-black text-white">{stats.total}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Catálogo editorial monitorado
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4.5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Reels Prontos (MP4)</p>
              <p className="mt-1 font-heading text-3xl font-black text-emerald-300">{stats.ready}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Vídeos 1080×1920 finalizados
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4.5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Fila de Reels</p>
              <p className="mt-1 font-heading text-3xl font-black text-amber-300">{stats.generating}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/80">
                <span className={`h-2 w-2 rounded-full bg-amber-400 ${stats.generating > 0 ? "animate-ping" : ""}`} />
                Aguardando ou renderizando
              </div>
            </div>

            <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 p-4.5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Automação de Publicação</p>
              <p className="mt-1 font-heading text-xl font-black text-white">ATIVADA ⚡</p>
              <p className="mt-2 text-xs text-gray-300">
                Quando o Reel termina, a publicação segue YouTube, Instagram e TikTok.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0e1017] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "all" ? "bg-white text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Todos ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ready")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "ready" ? "bg-emerald-500 text-black font-extrabold" : "text-gray-400 hover:text-emerald-300 hover:bg-white/5"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Prontos ({stats.ready})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("generating")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "generating" ? "bg-amber-500 text-black font-extrabold" : "text-gray-400 hover:text-amber-300 hover:bg-white/5"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Gerando ({stats.generating})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === "pending" ? "bg-white text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Pendentes ({stats.pending})
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#141620] px-3 py-1.5 text-xs font-semibold text-gray-300 focus:border-brand-orange focus:outline-none"
              >
                <option value="all">Todas as categorias</option>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título ou slug..."
                  className="w-full sm:w-64 rounded-lg border border-white/10 bg-[#141620] px-3.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-orange focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent mb-3" />
              <p className="text-sm font-semibold">Carregando catálogo de vídeos...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-center">
              <p className="font-heading text-lg font-black text-gray-300">Nenhum Reel encontrado</p>
              <p className="mt-1 max-w-md text-xs text-gray-500">
                Tente ajustar os filtros de busca ou gere um vídeo a partir de uma das matérias.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => {
                const cat = CATEGORY_CONFIG[item.category as PostCategory] || { label: "Plantão", color: "#FF5E00" };
                const isGenerating = item.status === "generating" || triggeringSlug === item.slug;
                const isReady = item.status === "ready";
                const isQueued = isGenerating && !!item.is_queued;
                const remainingSeconds = getEstimatedRemainingSeconds(item, clock);
                const isStalled = isGenerating && isReelStalled(item, clock);
                const isRetrying = isGenerating && (item.attempts || 0) > 1;
                const isEstimateOverdue = isGenerating && !isQueued && remainingSeconds === 0 && !isStalled;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0e1017] transition-all hover:border-white/20 hover:shadow-xl"
                  >
                    <div>
                      <div className="relative aspect-video w-full overflow-hidden bg-black">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#181a24] text-xs text-gray-600 font-bold">
                            SEM CAPA
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        <span
                          style={{ backgroundColor: cat.color }}
                          className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-black uppercase text-black"
                        >
                          {cat.label}
                        </span>

                        <div className="absolute right-3 top-3">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-black uppercase text-black backdrop-blur-sm shadow-md">
                              <span className="h-1.5 w-1.5 rounded-full bg-black" />
                              PRONTO
                            </span>
                          ) : isGenerating ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase text-black backdrop-blur-sm animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-black" />
                              {isQueued ? "NA FILA" : "GERANDO"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-300 backdrop-blur-sm">
                              PENDENTE
                            </span>
                          )}
                        </div>

                        {isReady && (
                          <button
                            type="button"
                            onClick={() => setSelectedReel(item)}
                            aria-label="Abrir pré-visualização e assistente do Reel"
                            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-white shadow-2xl transition-transform hover:scale-110">
                              <svg className="h-5 w-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="p-4">
                        <p className="text-[11px] font-semibold text-gray-400">
                          {item.is_published ? "Publicado em" : "Criado em"} {formatDate(item.published_at || item.created_at)}
                        </p>
                        <h3 className="mt-1 line-clamp-2 font-heading text-sm font-black leading-snug text-white">
                          {item.title}
                        </h3>

                        {isReady && (
                          <div className="mt-3 flex items-center gap-3 border-t border-white/5 pt-2 text-[11px] text-gray-400">
                            <span>⏱️ {item.duration ? `${item.duration}s` : "35s"}</span>
                            <span>💾 {formatBytes(item.file_size)}</span>
                            <span className="text-emerald-400 font-bold">1080×1920</span>
                          </div>
                        )}

                        {isReady && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3" aria-label="Status de publicação">
                            <SocialPublicationBadge id={item.id} platform="youtube" publication={item.socialPublications.youtube} />
                            <SocialPublicationBadge id={item.id} platform="instagram" publication={item.socialPublications.instagram} />
                            <SocialPublicationBadge id={item.id} platform="tiktok" publication={item.socialPublications.tiktok} />
                          </div>
                        )}

                        {isGenerating && (
                          <div className={`mt-3 border-t pt-3 text-xs font-semibold ${isStalled || isRetrying ? "border-red-500/30 text-red-300" : "border-amber-500/20 text-amber-300"}`}>
                            <div className="flex items-center gap-2">
                              {isStalled || isRetrying ? <span aria-hidden="true">⚠</span> : <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />}
                              <span>{isQueued ? `Na fila${item.queue_position ? ` · posição ${item.queue_position}` : ""}` : "Sintetizando voz e renderizando quadros"}</span>
                            </div>
                            <p className="mt-1 pl-5 text-[11px] font-medium text-gray-300">
                              Tempo estimado restante: {formatCountdown(remainingSeconds)}
                            </p>
                            {isEstimateOverdue && <p className="mt-1 pl-5 text-[11px] text-amber-200">A estimativa foi ultrapassada; o worker ainda informa que está processando.</p>}
                            {isRetrying && <p className="mt-1 pl-5 text-[11px]">A geração foi retomada automaticamente. Tentativa {item.attempts}.</p>}
                            {isStalled && <p role="alert" className="mt-1 pl-5 text-[11px]">Possível travamento detectado. Atualize a lista; se o status não mudar, cancele e tente gerar novamente.</p>}
                          </div>
                        )}

                        {item.status === "failed" && !isGenerating && (
                          <p className="mt-2 text-[11px] text-red-400">
                            {item.error || "Houve uma falha na renderização anterior."}{item.attempts ? ` Tentativas: ${item.attempts}.` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-white/10 p-3 pt-2.5">
                      {isReady ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReel(item)}
                            className="flex-1 rounded-lg bg-brand-orange px-3 py-2 text-center text-xs font-black uppercase text-white transition-colors hover:bg-brand-orange/90"
                          >
                            Assistente Social
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadReel(item)}
                            disabled={downloadingSlug !== null}
                            aria-label={downloadingSlug === item.slug ? "Preparando download do Reel" : `Baixar Reel de ${item.title}`}
                            aria-busy={downloadingSlug === item.slug}
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
                            title={downloadingSlug === item.slug ? "Preparando download" : "Baixar arquivo MP4"}
                          >
                            {downloadingSlug === item.slug ? (
                              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" aria-hidden="true" />
                            ) : (
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            )}
                          </button>
                        </div>
                      ) : isGenerating ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-2 text-center text-xs font-black uppercase text-amber-300 cursor-not-allowed"
                          >
                            {cancellingSlug === item.slug ? "Cancelando..." : isQueued ? "Aguardando fila..." : "Processando..."}
                          </button>
                          <button
                            type="button"
                            disabled={cancellingSlug === item.slug}
                            onClick={() => handleCancel(item.slug)}
                            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-extrabold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 hover:border-red-500/60"
                            title="Cancelar geração deste Reel"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={triggeringSlug === item.slug || hasGeneratingReel}
                          onClick={() => handleGenerate(item.slug)}
                          className="w-full rounded-lg px-3 py-2 text-center text-xs font-black uppercase transition-all bg-white/[0.08] text-white hover:bg-brand-orange hover:text-black border border-white/10"
                        >
                          {triggeringSlug === item.slug ? "Iniciando..." : item.status === "failed" ? "Tentar Novamente" : "Gerar Reel com IA"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl border border-white/15 bg-[#0e1017] shadow-2xl lg:flex-row lg:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedReel(null)}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-300 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Fechar assistente de postagem"
            >
              ✕
            </button>

            <div className="flex shrink-0 flex-col items-center justify-center border-b border-white/10 bg-black/60 p-4 lg:w-[380px] lg:border-b-0 lg:border-r">
              <div className="relative aspect-[9/16] w-[260px] max-w-full overflow-hidden rounded-2xl border-2 border-white/10 bg-black shadow-2xl">
                {selectedReel.video_url ? (
                  <video
                    src={selectedReel.video_url}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                    Vídeo indisponível
                  </div>
                )}
              </div>

              <div className="mt-3 flex w-full max-w-[260px] flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void downloadReel(selectedReel)}
                  disabled={downloadingSlug !== null}
                  aria-busy={downloadingSlug === selectedReel.slug}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-2 text-xs font-black uppercase text-white shadow-lg transition-colors hover:bg-brand-orange/90 disabled:cursor-wait disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloadingSlug === selectedReel.slug ? "Preparando download…" : "Baixar Vídeo (MP4)"}
                </button>

                {selectedReel.status === "generating" ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedReel.slug)}
                    disabled={cancellingSlug === selectedReel.slug}
                    className="rounded-lg border border-red-500/40 bg-red-500/10 py-1.5 text-[11px] font-bold text-red-300 hover:text-white hover:bg-red-500/20 transition-colors"
                  >
                    {cancellingSlug === selectedReel.slug ? "Cancelando..." : "Cancelar criação do Reel"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGenerate(selectedReel.slug)}
                    disabled={triggeringSlug === selectedReel.slug}
                    className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] font-bold text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    {triggeringSlug === selectedReel.slug ? "Processando..." : "Regerar este vídeo com IA"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-7 lg:overflow-y-auto">
              <div>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-brand-orange">
                  Assistente de Publicação
                </span>
                <h2 className="mt-1 font-heading text-xl font-black text-white sm:text-2xl leading-snug">
                  {selectedReel.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-xs text-gray-400">
                  {selectedReel.summary}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("instagram")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "instagram"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>📸 Instagram Reels</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tiktok")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "tiktok"
                      ? "bg-[#fe2c55] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>🎵 TikTok</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("youtube")}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all ${
                    activeTab === "youtube"
                      ? "bg-[#ff0000] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>🔴 YouTube Shorts</span>
                </button>
              </div>

              <div className="mt-4 flex-1">
                {activeTab === "instagram" && (
                  <InstagramPublisher
                    key={`ig:${selectedReel.id}:${selectedReel.reel_job_id || selectedReel.slug}`}
                    postId={selectedReel.id}
                    videoUrl={selectedReel.video_url}
                    initialCaption={selectedReel.copys.instagram.caption}
                    hashtags={selectedReel.copys.instagram.hashtags}
                    ready={selectedReel.status === "ready"}
                    socialPublication={selectedReel.socialPublications.instagram}
                    onDeliveryStatusChange={(status, error, externalId) => updateSocialPublication(selectedReel.id, "instagram", status, error || null, externalId || null)}
                  />
                )}

                {activeTab === "tiktok" && (
                  <TikTokPublisher
                    key={`tt:${selectedReel.id}:${selectedReel.reel_job_id || selectedReel.slug}`}
                    postId={selectedReel.id}
                    videoUrl={selectedReel.video_url}
                    initialCaption={selectedReel.copys.tiktok.caption}
                    hashtags={selectedReel.copys.tiktok.hashtags}
                    ready={selectedReel.status === "ready"}
                    socialPublication={selectedReel.socialPublications.tiktok}
                    onDeliveryStatusChange={(status, error, externalId) => updateSocialPublication(selectedReel.id, "tiktok", status, error || null, externalId || null)}
                  />
                )}

                {activeTab === "youtube" && (
                  <YouTubePublisher
                    key={`${selectedReel.id}:${selectedReel.reel_job_id}`}
                    postId={selectedReel.id}
                    reelJobId={selectedReel.reel_job_id}
                    initialTitle={selectedReel.copys.youtube.title}
                    initialDescription={selectedReel.copys.youtube.description}
                    initialTags={selectedReel.copys.youtube.tags}
                    ready={selectedReel.status === "ready"}
                    onPublicationUpdate={refreshReelsSilently}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export function AdminReelsView({ defaultMode = "short" }: { defaultMode?: "short" | "long" }) {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-gray-400">Carregando Central de Vídeos…</p>}><AdminReelsContent defaultMode={defaultMode} /></Suspense>;
}

export default function AdminReelsPage() {
  return <AdminReelsView defaultMode="short" />;
}
