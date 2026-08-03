"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";

const defaults = { breaking_news: true, followed_topics: true, brickboard_replies: true, weekly_digest: true };
type Preferences = typeof defaults;

export default function NotificationSettingsPage() {
  const { user, isLoading } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (user) supabase.from("notification_preferences").select("breaking_news, followed_topics, brickboard_replies, weekly_digest").eq("user_id", user.id).maybeSingle().then(({ data }) => { if (data) setPreferences(data as Preferences); }); }, [supabase, user]);
  async function save() { if (!user) return; const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...preferences, updated_at: new Date().toISOString() }); setMessage(error ? "Não foi possível salvar as preferências." : "Preferências atualizadas."); }
  if (isLoading) return <div className="min-h-dvh bg-background-void" />;
  return <main className="min-h-dvh bg-background-void text-white"><header className="border-b border-white/10"><div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between px-4"><Link href="/" className="text-xs font-bold text-gray-300">← Voltar</Link><span className="font-heading text-sm font-black">Notificações</span></div></header><div className="mx-auto max-w-3xl px-4 py-10"><h1 className="font-heading text-3xl font-black uppercase">O que merece interromper você?</h1><p className="mt-3 text-sm text-gray-400">Escolha os alertas enviados pelo Orange Brick. Avisos essenciais de segurança continuam ativos.</p><div className="mt-8 divide-y divide-white/10 border-y border-white/10">{[
    ["breaking_news", "Plantões", "Notícias urgentes confirmadas pela redação."],
    ["followed_topics", "Assuntos seguidos", "Atualizações sobre jogos, empresas e plataformas acompanhadas."],
    ["brickboard_replies", "Respostas no Brickboard", "Comentários, respostas e interações diretas."],
    ["weekly_digest", "Resumo semanal", "Uma seleção do que você pode ter perdido."],
  ].map(([key, label, description]) => <label key={key} className="flex cursor-pointer items-start justify-between gap-6 py-5"><span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-relaxed text-gray-400">{description}</span></span><input type="checkbox" checked={preferences[key as keyof Preferences]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 h-5 w-5 accent-[#ff5e00]" /></label>)}</div>{message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}<button onClick={() => void save()} className="mt-6 min-h-11 bg-brand-orange px-6 text-xs font-black uppercase">Salvar preferências</button></div></main>;
}
