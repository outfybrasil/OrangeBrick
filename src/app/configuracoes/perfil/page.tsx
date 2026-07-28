"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDataClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { resolveAvatarUrl } from "@/lib/avatar";

const platforms = ["PS5", "Xbox Series", "Switch 2", "PC", "Mobile"];
const categories = ["breaking", "hardware", "industry", "modding", "review", "opinion"];

export default function ProfileSettingsPage() {
  const { user, profile, isLoading, refreshProfile } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoritePlatforms, setFavoritePlatforms] = useState<string[]>([]);
  const [favoriteCategories, setFavoriteCategories] = useState<string[]>([]);
  const [showLifetimeXp, setShowLifetimeXp] = useState(true);
  const [showActivityStats, setShowActivityStats] = useState(true);
  const [showSeasonHistory, setShowSeasonHistory] = useState(true);
  const [showInLeaderboard, setShowInLeaderboard] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/");
    if (!profile) return;
    queueMicrotask(() => {
      setDisplayName(profile.display_name || profile.nickname);
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setFavoritePlatforms(profile.favorite_platforms || []);
      setFavoriteCategories(profile.favorite_categories || []);
      setShowLifetimeXp(profile.show_lifetime_xp);
      setShowActivityStats(profile.show_activity_stats);
      setShowSeasonHistory(profile.show_season_history);
      setShowInLeaderboard(profile.show_in_leaderboard);
    });
  }, [isLoading, profile, router, user]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !profile) return;
    setIsSaving(true);
    setMessage(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(normalizedUsername)) {
      setMessage("O usuário deve ter de 3 a 30 caracteres, usando letras, números ou hífen.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        nickname: displayName.trim(),
        username: normalizedUsername,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        favorite_platforms: favoritePlatforms,
        favorite_categories: favoriteCategories,
        show_lifetime_xp: showLifetimeXp,
        show_activity_stats: showActivityStats,
        show_season_history: showSeasonHistory,
        show_in_leaderboard: showInLeaderboard,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message.includes("duplicate") ? "Este nome de usuário já está em uso." : "Não foi possível salvar o perfil.");
    } else {
      await refreshProfile();
      setMessage("Perfil atualizado.");
    }
    setIsSaving(false);
  }

  if (isLoading || !profile) {
    return <div className="min-h-dvh bg-background-void" />;
  }

  return (
    <main className="min-h-dvh bg-background-void text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href={`/profile/${profile.username}`} className="flex min-h-11 items-center text-xs font-bold text-gray-300 hover:text-white">← Meu perfil</Link>
          <span className="font-heading text-sm font-black">Configurações</span>
        </div>
      </header>

      <form onSubmit={saveProfile} className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside>
            <h1 className="font-heading text-3xl font-black">Seu perfil</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">Controle sua identidade, sua vitrine e o que aparece publicamente.</p>
            <img
              src={resolveAvatarUrl(avatarUrl, displayName)}
              alt="Prévia do avatar"
              className="mt-7 h-24 w-24 object-cover"
              referrerPolicy="no-referrer"
            />
          </aside>

          <div className="space-y-12">
            <SettingsSection title="Identidade">
              <Field label="Nome exibido">
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} required className="min-h-12 w-full border border-white/15 bg-black/20 px-4 text-sm outline-none focus:border-brand-orange/60" />
              </Field>
              <Field label="Usuário" hint="O endereço público do seu perfil.">
                <div className="flex min-h-12 items-center border border-white/15 bg-black/20 px-4 focus-within:border-brand-orange/60">
                  <span className="text-gray-500">@</span>
                  <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={30} required className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm outline-none" />
                </div>
              </Field>
              <Field label="Biografia" hint={`${bio.length}/160 caracteres`}>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={4} className="w-full resize-none border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none focus:border-brand-orange/60" />
              </Field>
              <Field label="Avatar" hint="Use uma imagem HTTPS. O upload próprio será adicionado em uma etapa posterior.">
                <input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="min-h-12 w-full border border-white/15 bg-black/20 px-4 text-sm outline-none focus:border-brand-orange/60" />
              </Field>
            </SettingsSection>

            <SettingsSection title="Afinidades">
              <ChoiceGroup title="Plataformas" options={platforms} selected={favoritePlatforms} onChange={setFavoritePlatforms} />
              <ChoiceGroup title="Categorias" options={categories} selected={favoriteCategories} onChange={setFavoriteCategories} />
            </SettingsSection>

            <SettingsSection title="Privacidade">
              <PrivacyToggle label="Exibir XP vitalício" description="O nível continua público, mas o total exato pode ficar privado." checked={showLifetimeXp} onChange={setShowLifetimeXp} />
              <PrivacyToggle label="Exibir estatísticas" description="Mostra Bricks, comentários e interações recebidas." checked={showActivityStats} onChange={setShowActivityStats} />
              <PrivacyToggle label="Exibir temporadas anteriores" description="Permite mostrar seu histórico competitivo." checked={showSeasonHistory} onChange={setShowSeasonHistory} />
              <PrivacyToggle label="Participar do ranking público" description="Seu XP sazonal continua sendo calculado mesmo com o perfil oculto do ranking." checked={showInLeaderboard} onChange={setShowInLeaderboard} />
            </SettingsSection>

            {message && <p role="status" className={`border-y py-3 text-sm ${message === "Perfil atualizado." ? "border-emerald-400/30 text-emerald-200" : "border-red-400/30 text-red-200"}`}>{message}</p>}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-6">
              <Link href={`/profile/${profile.username}`} className="inline-flex min-h-11 items-center px-4 text-xs font-bold text-gray-300 hover:text-white">Cancelar</Link>
              <button type="submit" disabled={isSaving} className="min-h-11 bg-brand-orange px-6 text-xs font-bold text-white hover:bg-[#ff7526] disabled:opacity-50">
                {isSaving ? "Salvando…" : "Salvar perfil"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-white/10 pb-3 font-heading text-xl font-bold">{title}</h2>
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-4 text-xs font-bold text-gray-200">
        {label}
        {hint && <span className="font-normal text-gray-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ChoiceGroup({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (values: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold text-gray-200">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? selected.filter((value) => value !== option) : [...selected, option].slice(-4))}
              className={`min-h-11 border px-3 text-xs font-semibold ${active ? "border-brand-orange bg-brand-orange/10 text-white" : "border-white/15 text-gray-400 hover:text-white"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PrivacyToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border-b border-white/10 pb-5">
      <span>
        <strong className="block text-sm text-white">{label}</strong>
        <span className="mt-1 block max-w-xl text-xs leading-5 text-gray-400">{description}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 accent-[#ff5e00]" />
    </label>
  );
}
