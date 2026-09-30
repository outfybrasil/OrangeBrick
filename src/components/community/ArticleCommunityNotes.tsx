"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { createDataClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  content: string;
  source_url: string;
  status: "pending" | "helpful" | "rejected";
  helpful_count: number;
  created_at: string;
}

export function ArticleCommunityNotes({ postId }: { postId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const supabase = useMemo(() => createDataClient(), []);
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [votedNotes, setVotedNotes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voteLoadError, setVoteLoadError] = useState<string | null>(null);
  const [pendingVotes, setPendingVotes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadNotes() {
      setIsLoading(true);
      setLoadError(null);
      setVoteLoadError(null);
      try {
        const { data, error } = await supabase
          .from("community_notes")
          .select("id, content, source_url, status, helpful_count, created_at")
          .eq("post_id", postId)
          .order("helpful_count", { ascending: false });
        if (error) throw error;
        if (!isMounted) return;
        const loadedNotes = (data || []) as Note[];
        setNotes(loadedNotes);
        if (!user || loadedNotes.length === 0) {
          setVotedNotes([]);
          return;
        }
        const { data: voteData, error: voteError } = await supabase
          .from("community_note_votes")
          .select("note_id")
          .eq("user_id", user.id)
          .in("note_id", loadedNotes.map((note) => note.id));
        if (voteError) {
          if (isMounted) setVoteLoadError("Não foi possível carregar seus votos. As notas continuam disponíveis para leitura.");
          return;
        }
        if (isMounted) setVotedNotes((voteData || []).map((row) => row.note_id as string));
      } catch {
        if (isMounted) setLoadError("Não foi possível carregar as notas da comunidade.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadNotes();

    return () => {
      isMounted = false;
    };
  }, [postId, retry, supabase, user]);

  async function toggleHelpful(noteId: string) {
    if (!user) {
      toast.info("Entre na sua conta para avaliar esta nota.");
      setMessage("Entre para avaliar esta nota.");
      return;
    }
    if (pendingVotes.includes(noteId) || voteLoadError) return;
    const active = votedNotes.includes(noteId);
    setPendingVotes((current) => [...current, noteId]);
    setMessage(null);
    try {
      const result = active
        ? await supabase.from("community_note_votes").delete().eq("note_id", noteId).eq("user_id", user.id)
        : await supabase.from("community_note_votes").insert({ note_id: noteId, user_id: user.id });
      if (result.error) throw result.error;
      setVotedNotes((current) => active ? current.filter((id) => id !== noteId) : [...current, noteId]);
      setNotes((current) => current.map((note) => note.id === noteId
        ? { ...note, helpful_count: Math.max(0, note.helpful_count + (active ? -1 : 1)) }
        : note));
      toast.success(active ? "Voto de utilidade removido." : "Nota marcada como util.");
    } catch {
      setMessage("N\u00e3o foi poss\u00edvel salvar seu voto. Tente novamente.");
      toast.error("N\u00e3o foi poss\u00edvel salvar seu voto.");
    } finally {
      setPendingVotes((current) => current.filter((id) => id !== noteId));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!user) {
      toast.info("Entre na sua conta para enviar uma nota.");
      setMessage("Entre na sua conta para enviar uma nota.");
      return;
    }
    if (content.trim().length < 40 || !sourceUrl.startsWith("https://")) {
      toast.error("Escreva ao menos 40 caracteres e informe uma fonte HTTPS.");
      setMessage("Escreva ao menos 40 caracteres e informe uma fonte HTTPS.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("community_notes").insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        source_url: sourceUrl.trim(),
      });
      if (error) throw error;
      setContent("");
      setSourceUrl("");
      setOpen(false);
      toast.success("Nota enviada para revisao editorial.");
      setMessage("Nota enviada para revisao editorial.");
    } catch {
      toast.error("N\u00e3o foi poss\u00edvel enviar a nota.");
      setMessage("N\u00e3o foi poss\u00edvel enviar a nota.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const helpfulNotes = notes.filter((note) => note.status === "helpful");

  return (
    <section className="mt-10 border-y border-white/10 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">
            Contexto colaborativo
          </p>
          <h2 className="mt-1 font-heading text-xl font-black uppercase">
            Notas da comunidade
          </h2>
          <p className="mt-2 max-w-xl text-sm text-gray-400">
            Leitores podem acrescentar contexto verificável. Toda nota exige fonte e passa por revisão.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-11 border border-brand-orange/50 px-4 text-xs font-bold text-brand-orange hover:bg-brand-orange/10"
        >
          Enviar uma nota
        </button>
      </div>

      {isLoading ? <p role="status" className="mt-5 text-sm text-gray-400">Carregando notas…</p> : loadError ? <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-red-400/20 py-3 text-sm text-red-200"><span>{loadError}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 px-3 font-bold text-brand-orange">Tentar novamente</button></div> : helpfulNotes.length === 0 ? <p className="mt-5 border-t border-white/10 pt-4 text-sm text-gray-400">Ainda não há notas aprovadas para esta matéria.</p> : null}
      {voteLoadError && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200"><span>{voteLoadError}</span><button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 px-3 font-bold text-brand-orange">Tentar novamente</button></div>}

      {message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}

      {open && (
        <form onSubmit={submit} className="mt-5 space-y-3 border border-white/10 bg-card-slate/30 p-4">
          <label htmlFor="community-note-content" className="block text-xs font-bold text-gray-200">Contexto que deseja acrescentar</label>
          <textarea
            id="community-note-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Que contexto importante está faltando?"
            className="w-full border border-white/10 bg-background-void p-3 text-sm text-white outline-none focus:border-brand-orange/50"
          />
          <label htmlFor="community-note-source" className="block text-xs font-bold text-gray-200">Fonte verificável</label>
          <input
            id="community-note-source"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://fonte-confiavel.com"
            className="min-h-11 w-full border border-white/10 bg-background-void px-3 text-sm text-white outline-none focus:border-brand-orange/50"
          />
          <button disabled={isSubmitting} className="min-h-11 bg-brand-orange px-5 text-xs font-black text-white disabled:opacity-60">
            {isSubmitting ? "Enviando…" : "Enviar para revisão"}
          </button>
        </form>
      )}

      {helpfulNotes.map((note) => (
        <article key={note.id} className="mt-5 border-t border-white/10 pt-5">
          <p className="text-sm leading-relaxed text-white">{note.content}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={note.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-xs font-bold text-brand-orange hover:text-white"
            >
              Consultar fonte ↗
            </a>
            <button
              type="button"
              aria-pressed={votedNotes.includes(note.id)}
              disabled={pendingVotes.includes(note.id) || Boolean(voteLoadError)}
              onClick={() => void toggleHelpful(note.id)}
              className={`min-h-11 border px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                votedNotes.includes(note.id)
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-white/15 text-white"
              }`}
            >
              Útil · {note.helpful_count}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
