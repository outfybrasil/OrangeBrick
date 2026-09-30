"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { AchievementMark } from "@/components/community/ProgressionUI";
import type { AchievementProgress, PublicProfileData } from "@/lib/types/progression";

type AchievementWithMeta = AchievementProgress & { is_hidden?: boolean };

function unlockRatio(item: AchievementProgress): number {
  return item.target > 0 ? Math.min(item.progress / item.target, 1) : 0;
}

function prepareAchievements(list: AchievementWithMeta[]): AchievementWithMeta[] {
  return list
    .map((item) =>
      item.is_hidden && !item.unlocked_at
        ? { ...item, name: "Conquista secreta", description: "Continue contribuindo para revelar.", progress: 0 }
        : item
    )
    .sort((a, b) => {
      if (a.is_equipped !== b.is_equipped) return a.is_equipped ? -1 : 1;
      const aUnlocked = Boolean(a.unlocked_at);
      const bUnlocked = Boolean(b.unlocked_at);
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1;
      return unlockRatio(b) - unlockRatio(a);
    });
}

export default function AchievementsPage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [equipped, setEquipped] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      setProgressReady(false);
      try {
      const { data: catalog, error: catalogError } = await supabase
        .from("achievements")
        .select("slug, name, description, category, rarity, criteria, is_hidden")
        .eq("is_active", true)
        .order("sort_order");

      if (!isActive) return;
      if (catalogError) {
        setLoadError("Não foi possível carregar as conquistas.");
        setIsLoading(false);
        return;
      }

      const catalogAchievements = ((catalog || []) as Array<Record<string, unknown>>).map((item) => ({
        slug: item.slug as string,
        name: item.name as string,
        description: item.description as string,
        category: item.category as string,
        rarity: item.rarity as AchievementProgress["rarity"],
        progress: 0,
        target: Number((item.criteria as { target?: number })?.target || 1),
        unlocked_at: null,
        is_equipped: false,
        is_hidden: Boolean(item.is_hidden),
      }));

      if (profile?.username) {
        const { data, error: progressError } = await supabase.rpc("public_profile", { target_username: profile.username });
        if (progressError || !data) {
          if (isActive) {
            setLoadError("Não foi possível carregar seu progresso. Tente novamente.");
            setIsLoading(false);
          }
          return;
        }
        const loaded = data as PublicProfileData | null;
        if (!isActive) return;
        if (loaded) {
          const progressBySlug = new Map(loaded.achievements.map((item) => [item.slug, item]));
          const mergedAchievements = prepareAchievements(
            catalogAchievements.map((item) => ({ ...item, ...(progressBySlug.get(item.slug) || {}) }))
          );
          setAchievements(mergedAchievements);
          setEquipped(mergedAchievements.filter((item) => item.is_equipped).map((item) => item.slug));
          setProgressReady(true);
          setIsLoading(false);
          return;
        }
      }

      setAchievements(prepareAchievements(catalogAchievements));
      setEquipped([]);
      setIsLoading(false);
      } catch {
        if (isActive) {
          setLoadError("Falha ao carregar conquistas. Tente novamente.");
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      isActive = false;
    };
  }, [isAuthLoading, loadAttempt, profile?.username, supabase, user?.id]);

  function toggleShowcase(slug: string) {
    const achievement = achievements.find((item) => item.slug === slug);
    if (!achievement?.unlocked_at) {
      setMessage(achievement?.description || "Esta conquista ainda não foi desbloqueada.");
      return;
    }
    if (!equipped.includes(slug) && equipped.length >= 3) {
      setMessage("Sua vitrine comporta três conquistas. Remova uma antes de adicionar outra.");
      return;
    }
    setMessage(null);
    setEquipped((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  async function saveShowcase() {
    if (!progressReady || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc("set_achievement_showcase", { target_slugs: equipped });
      setMessage(error ? "Não foi possível atualizar sua vitrine." : "Vitrine atualizada.");
    } catch {
      setMessage("Não foi possível atualizar sua vitrine.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main id="conteudo-principal" tabIndex={-1} className="min-h-dvh bg-background-void text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/brickboard" className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Brickboard</Link>
          <Link href="/brickboard/ranking" className="flex min-h-11 items-center text-xs font-bold text-brand-orange hover:text-white">Ranking</Link>
        </div>
      </header>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-xs font-bold text-brand-orange">Sua história no Brickboard</p>
          <h1 className="mt-3 max-w-4xl font-heading text-[clamp(2.5rem,8vw,5rem)] font-black leading-[0.92] tracking-[-0.03em]">Marcas que precisam ser conquistadas.</h1>
          <p className="mt-5 max-w-[68ch] text-sm leading-6 text-gray-300">Cada conquista registra uma contribuição real. Não existe atalho, compra ou sorteio.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {!user && !isAuthLoading && <div className="mb-8 border-y border-white/10 py-5 text-sm text-gray-300"><p>Você está explorando o catálogo de conquistas.</p><Link href="/entrar?next=%2Fbrickboard%2Fconquistas" className="mt-2 inline-flex min-h-11 items-center text-brand-orange underline">Entrar para ver meu progresso</Link></div>}
        {message && <p role="status" className="mb-4 text-sm text-gray-300">{message}</p>}
        {user && !isAuthLoading && !profile?.username && <div className="mb-8 border-y border-amber-400/20 py-5 text-sm text-amber-100"><p>Seu perfil ainda não está configurado para exibir progresso.</p><Link href="/profile/setup" className="mt-2 inline-flex min-h-11 items-center text-brand-orange underline">Configurar perfil</Link></div>}
        {user && !isAuthLoading && profile?.username && progressReady && (
          <div className="mb-10 flex flex-col gap-4 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-300">Selecione até três conquistas desbloqueadas para exibir no perfil.</p>
            <div className="flex items-center gap-3">
              {message && <span className="text-xs text-gray-400">{message}</span>}
              <button type="button" onClick={() => void saveShowcase()} disabled={isSaving} className="min-h-11 bg-brand-orange px-5 text-xs font-bold hover:bg-[#ff7526] disabled:cursor-wait disabled:opacity-60">{isSaving ? "Salvando…" : "Salvar vitrine"}</button>
            </div>
          </div>
        )}
        {loadError ? (
          <div className="border-y border-red-400/30 py-8"><p role="alert" className="text-sm text-red-200">{loadError}</p><button type="button" onClick={() => { setIsLoading(true); setLoadAttempt((value) => value + 1); }} className="mt-4 min-h-11 border border-red-300/40 px-4 text-sm font-bold text-red-100 hover:bg-red-300/10">Tentar novamente</button></div>
        ) : isLoading && achievements.length === 0 ? (
          <p className="border-y border-white/10 py-12 text-sm text-gray-400">Carregando conquistas…</p>
        ) : (
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <button
                key={achievement.slug}
                type="button"
                onClick={() => progressReady && toggleShowcase(achievement.slug)}
                disabled={!progressReady}
                aria-label={`${achievement.name}: ${achievement.description}${achievement.unlocked_at ? ". Selecionar para vitrine" : ". Ver critério"}`}
                aria-pressed={equipped.includes(achievement.slug)}
                className={`min-w-0 text-left disabled:cursor-default ${equipped.includes(achievement.slug) ? "bg-brand-orange/[0.06] px-4 pb-4" : ""}`}
              >
                <AchievementMark achievement={achievement} catalog={!progressReady} />
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
