"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { AchievementMark } from "@/components/community/ProgressionUI";
import type { AchievementProgress, PublicProfileData } from "@/lib/types/progression";

export default function AchievementsPage() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [equipped, setEquipped] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (profile?.username) {
        const { data } = await supabase.rpc("public_profile", { target_username: profile.username });
        const loaded = data as PublicProfileData | null;
        if (loaded) {
          setAchievements(loaded.achievements);
          setEquipped(loaded.achievements.filter((item) => item.is_equipped).map((item) => item.slug));
          return;
        }
      }

      const { data } = await supabase.from("achievements").select("slug, name, description, category, rarity, criteria, is_hidden").eq("is_active", true).order("sort_order");
      setAchievements(((data || []) as Array<Record<string, unknown>>).map((item) => ({
        slug: item.slug as string,
        name: item.name as string,
        description: item.description as string,
        category: item.category as string,
        rarity: item.rarity as AchievementProgress["rarity"],
        progress: 0,
        target: Number((item.criteria as { target?: number })?.target || 1),
        unlocked_at: null,
        is_equipped: false,
      })));
    }
    void load();
  }, [profile?.username, supabase]);

  function toggleShowcase(slug: string) {
    const achievement = achievements.find((item) => item.slug === slug);
    if (!achievement?.unlocked_at) return;
    setEquipped((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug].slice(-3));
  }

  async function saveShowcase() {
    const { error } = await supabase.rpc("set_achievement_showcase", { target_slugs: equipped });
    setMessage(error ? "Não foi possível atualizar sua vitrine." : "Vitrine atualizada.");
  }

  return (
    <main className="min-h-dvh bg-background-void text-white">
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
        {user && (
          <div className="mb-10 flex flex-col gap-4 border-y border-white/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-300">Selecione até três conquistas desbloqueadas para exibir no perfil.</p>
            <div className="flex items-center gap-3">
              {message && <span className="text-xs text-gray-400">{message}</span>}
              <button type="button" onClick={() => void saveShowcase()} className="min-h-11 bg-brand-orange px-5 text-xs font-bold hover:bg-[#ff7526]">Salvar vitrine</button>
            </div>
          </div>
        )}
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <button
              key={achievement.slug}
              type="button"
              onClick={() => toggleShowcase(achievement.slug)}
              disabled={!achievement.unlocked_at}
              aria-pressed={equipped.includes(achievement.slug)}
              className={`min-w-0 text-left disabled:cursor-default ${equipped.includes(achievement.slug) ? "bg-brand-orange/[0.06] px-4 pb-4" : ""}`}
            >
              <AchievementMark achievement={achievement} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
