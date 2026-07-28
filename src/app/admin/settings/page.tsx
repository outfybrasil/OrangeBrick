"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import type { PostCategory } from "@/lib/types/database";

interface AdminPreferences {
  defaultAuthor: string;
  defaultCategory: PostCategory;
}

const DEFAULT_PREFERENCES: AdminPreferences = {
  defaultAuthor: "Redação",
  defaultCategory: "breaking",
};

export default function AdminSettingsPage() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [supabase] = useState(() => createDataClient());

  useEffect(() => {
    queueMicrotask(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("admin_preferences").select("*").eq("user_id", user.id).maybeSingle();
        const stored = data as { default_author: string; default_category: PostCategory } | null;
        if (stored) setPreferences({ defaultAuthor: stored.default_author, defaultCategory: stored.default_category });
      }
      setIsReady(true);
    });
  }, [supabase]);

  const savePreferences = async () => {
    setIsSaving(true);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user ? await supabase.from("admin_preferences").upsert({
      user_id: user.id,
      default_author: preferences.defaultAuthor.trim(),
      default_category: preferences.defaultCategory,
      updated_at: new Date().toISOString(),
    }) : { error: new Error("Sessão expirada") };
    setMessage(error ? "Não foi possível salvar. Tente novamente." : "Preferências salvas na sua conta.");
    setIsSaving(false);
  };

  return (
    <AdminShell active="settings" title="Configurações" description="Defina os padrões usados ao abrir uma nova matéria.">
      <section className="max-w-2xl rounded-xl border border-white/10 bg-[#0e0f14] p-5">
        <h2 className="text-base font-bold text-white">Padrões do editor</h2>
        <p className="mt-1 text-xs leading-5 text-gray-400">Essas preferências não preenchem conteúdo editorial; apenas definem autoria e categoria iniciais.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="default-author" className="mb-1.5 block text-xs font-bold text-gray-300">Autor padrão</label>
            <input
              id="default-author"
              value={preferences.defaultAuthor}
              maxLength={80}
              disabled={!isReady}
              onChange={(event) => setPreferences((current) => ({ ...current, defaultAuthor: event.target.value }))}
              className="h-11 w-full rounded-lg border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label htmlFor="default-category" className="mb-1.5 block text-xs font-bold text-gray-300">Categoria padrão</label>
            <select
              id="default-category"
              value={preferences.defaultCategory}
              disabled={!isReady}
              onChange={(event) => setPreferences((current) => ({ ...current, defaultCategory: event.target.value as PostCategory }))}
              className="h-11 w-full rounded-lg border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/50 disabled:opacity-50"
            >
              <option value="breaking">Plantão</option>
              <option value="review">Review</option>
              <option value="hardware">Hard News</option>
              <option value="opinion">Opinião</option>
              <option value="industry">Radar</option>
              <option value="modding">Gambiarra</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <button type="button" onClick={() => void savePreferences()} disabled={!isReady || isSaving || !preferences.defaultAuthor.trim()} className="min-h-11 rounded-lg bg-brand-orange px-4 text-xs font-bold text-white hover:bg-[#ff7526] disabled:opacity-40">
            {isSaving ? "Salvando..." : "Salvar preferências"}
          </button>
          {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
        </div>
      </section>
    </AdminShell>
  );
}
