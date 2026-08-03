"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { createDataClient } from "@/lib/supabase/client";

interface Note { id: string; content: string; source_url: string; status: "pending" | "helpful" | "rejected"; helpful_count: number; created_at: string }

export function ArticleCommunityNotes({ postId }: { postId: string }) {
  const { user } = useAuth();
  const supabase = useMemo(() => createDataClient(), []);
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [votedNotes, setVotedNotes] = useState<string[]>([]);

  useEffect(() => { supabase.from("community_notes").select("id, content, source_url, status, helpful_count, created_at").eq("post_id", postId).order("helpful_count", { ascending: false }).then(({ data }) => setNotes((data || []) as Note[])); if (user) supabase.from("community_note_votes").select("note_id").eq("user_id", user.id).then(({ data }) => setVotedNotes((data || []).map((row) => row.note_id as string))); }, [postId, supabase, user]);

  async function toggleHelpful(noteId: string) {
    if (!user) { setMessage("Entre para avaliar esta nota."); return; }
    const active = votedNotes.includes(noteId);
    setVotedNotes((current) => active ? current.filter((id) => id !== noteId) : [...current, noteId]);
    setNotes((current) => current.map((note) => note.id === noteId ? { ...note, helpful_count: Math.max(0, note.helpful_count + (active ? -1 : 1)) } : note));
    if (active) await supabase.from("community_note_votes").delete().eq("note_id", noteId).eq("user_id", user.id);
    else await supabase.from("community_note_votes").insert({ note_id: noteId, user_id: user.id });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) { setMessage("Entre na sua conta para enviar uma nota."); return; }
    if (content.trim().length < 40 || !sourceUrl.startsWith("https://")) { setMessage("Escreva ao menos 40 caracteres e informe uma fonte HTTPS."); return; }
    const { error } = await supabase.from("community_notes").insert({ post_id: postId, user_id: user.id, content: content.trim(), source_url: sourceUrl.trim() });
    if (error) setMessage("Não foi possível enviar a nota.");
    else { setContent(""); setSourceUrl(""); setOpen(false); setMessage("Nota enviada para revisão editorial."); }
  }

  return <section className="mt-10 border-y border-white/10 py-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">Contexto colaborativo</p><h2 className="mt-1 font-heading text-xl font-black uppercase">Notas da comunidade</h2><p className="mt-2 max-w-xl text-sm text-gray-400">Leitores podem acrescentar contexto verificável. Toda nota exige fonte e passa por revisão.</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="min-h-11 border border-brand-orange/50 px-4 text-xs font-bold text-brand-orange hover:bg-brand-orange/10">Enviar uma nota</button></div>
    {message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}
    {open && <form onSubmit={submit} className="mt-5 space-y-3 border border-white/10 bg-card-slate/30 p-4"><textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={500} rows={4} placeholder="Que contexto importante está faltando?" className="w-full border border-white/10 bg-background-void p-3 text-sm text-white outline-none focus:border-brand-orange/50" /><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://fonte-confiavel.com" className="min-h-11 w-full border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/50" /><button className="min-h-11 bg-brand-orange px-5 text-xs font-black text-white">Enviar para revisão</button></form>}
    {notes.filter((note) => note.status === "helpful").map((note) => <article key={note.id} className="mt-5 border-t border-white/10 pt-5"><p className="text-sm leading-relaxed text-white">{note.content}</p><div className="mt-2 flex flex-wrap items-center gap-3"><a href={note.source_url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center text-xs font-bold text-brand-orange hover:text-white">Consultar fonte ↗</a><button type="button" aria-pressed={votedNotes.includes(note.id)} onClick={() => void toggleHelpful(note.id)} className={`min-h-9 border px-3 text-xs font-bold ${votedNotes.includes(note.id) ? "border-emerald-400 bg-emerald-400/10 text-emerald-300" : "border-white/15 text-white"}`}>Útil · {note.helpful_count}</button></div></article>)}
  </section>;
}
