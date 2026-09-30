"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { createDataClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/types/database";

interface TrashItem { id: string; content_type: string; content_id: string; snapshot: Record<string, unknown>; deleted_at: string; expires_at: string }
interface AuditItem { id: number; action: string; target_type: string; target_id: string | null; created_at: string }
interface StorageHealth { editorial: { files: number; bytes: number }; profiles: { files: number; bytes: number }; trackedEditorialFiles: number; possibleEditorialOrphans: number; orphans: Array<{ path: string; bytes: number }> }
interface CommunityNote { id: string; content: string; source_url: string; status: "pending" | "helpful" | "rejected"; created_at: string }
interface AppError { id: string; source: string; message: string; route: string | null; created_at: string }
interface AutomationStatus { ready: boolean; date: string; reason?: string; slots?: Array<{ hour: number; state: string; updatedAt: string | null }>; pendingNotices?: number }

function slotLabel(state: string) {
  if (state === "awaiting") return "Aguardando horário";
  if (state === "missing") return "Sem execução registrada";
  if (state === "running") return "Em execução";
  if (state === "stalled") return "Execução parada";
  if (state === "failed") return "Falhou";
  if (state.startsWith("draft:")) return "Rascunho para revisão";
  if (state.startsWith("publishing:")) return "Publicação em andamento";
  if (state.startsWith("published:")) return "Publicada";
  return "Estado desconhecido";
}

export default function AdminHealthPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [storage, setStorage] = useState<StorageHealth | null>(null);
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<Post | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ data: postData, error: postsError }, { data: trashData, error: trashError }, { data: auditData, error: auditError }, { data: noteData, error: notesError }, { data: errorData, error: eventsError }, { data: { session }, error: sessionError }] = await Promise.all([
        supabase.from("posts").select("*").order("updated_at", { ascending: false }),
        supabase.from("admin_trash").select("*").is("restored_at", null).order("deleted_at", { ascending: false }),
        supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("community_notes").select("id, content, source_url, status, created_at").eq("status", "pending").order("created_at", { ascending: true }),
        supabase.from("app_error_events").select("id, source, message, route, created_at").order("created_at", { ascending: false }).limit(20),
        supabase.auth.getSession(),
      ]);
      setPosts((postData || []) as Post[]); setTrash((trashData || []) as unknown as TrashItem[]); setAudit((auditData || []) as AuditItem[]); setNotes((noteData || []) as CommunityNote[]); setAppErrors((errorData || []) as AppError[]);
      const errors: Record<string, string> = {};
      if (postsError) errors.posts = "Não foi possível carregar as matérias.";
      if (trashError) errors.trash = "Lixeira indisponível. Verifique a tabela admin_trash.";
      if (auditError) errors.audit = "Auditoria indisponível. Verifique a tabela admin_audit_log.";
      if (notesError) errors.notes = "Não foi possível carregar as notas da comunidade.";
      if (eventsError) errors.events = "Não foi possível carregar os erros recentes.";
      if (sessionError || !session) {
        setStorage(null);
        setAutomation(null);
        errors.storage = "Sessão indisponível para consultar o armazenamento.";
        errors.automation = "Sessão indisponível para consultar a automação.";
      } else {
        try {
          const response = await fetch("/api/admin/storage-health", { headers: { Authorization: `Bearer ${session.access_token}` } });
          if (!response.ok) throw new Error("storage_unavailable");
          setStorage(await response.json());
        } catch {
          setStorage(null);
          errors.storage = "Não foi possível consultar o armazenamento.";
        }
        try {
          const response = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
          if (!response.ok) throw new Error("automation_unavailable");
          const data = await response.json();
          setAutomation(data.automation as AutomationStatus);
          if (!data.automation?.ready) errors.automation = data.automation?.reason || "Não foi possível consultar a automação.";
        } catch {
          setAutomation(null);
          errors.automation = "Não foi possível consultar a automação.";
        }
      }
      setLoadErrors(errors);
    } catch {
      setLoadErrors({ all: "Não foi possível carregar o painel. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const issues = posts.map((post) => ({ post, warnings: [!post.image_url && "Sem imagem de capa", (!Array.isArray(post.editorial_sources) || post.editorial_sources.length === 0) && "Sem fontes estruturadas", post.title.length > 70 && "Título acima de 70 caracteres", post.summary.length < 80 && "Resumo curto"].filter(Boolean) as string[] })).filter((item) => item.warnings.length);
  async function restore(id: string) { const { error } = await supabase.rpc("admin_restore_post", { target_trash_id: id }); setMessage(error ? "Não foi possível restaurar." : "Matéria restaurada."); await load(); }
  async function moderateNote(id: string, status: "helpful" | "rejected") { const { error } = await supabase.from("community_notes").update({ status }).eq("id", id); setMessage(error ? "Não foi possível revisar a nota." : status === "helpful" ? "Nota aprovada." : "Nota rejeitada."); await load(); }
  async function archivePost() { if (!archiveCandidate) return; const { error } = await supabase.rpc("admin_archive_post", { target_post_id: archiveCandidate.id }); setMessage(error ? "Não foi possível arquivar a matéria." : "Matéria movida para a lixeira por 30 dias."); setArchiveCandidate(null); await load(); }
  async function deleteOrphan(path: string) { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; const response = await fetch("/api/admin/storage-health", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ paths: [path] }) }); setMessage(response.ok ? "Arquivo órfão removido." : "Não foi possível remover o arquivo."); await load(); }
  const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return <AdminShell active="health" title="Saúde e auditoria" description="Riscos editoriais, recuperação, ações administrativas e uso de armazenamento."><div className="grid gap-4 md:grid-cols-4">{[
    ["Alertas editoriais", loadErrors.posts || loadErrors.all || isLoading ? "—" : issues.length], ["Notas aguardando revisão", loadErrors.notes || loadErrors.all || isLoading ? "—" : notes.length], ["Itens na lixeira", loadErrors.trash || loadErrors.all || isLoading ? "—" : trash.length], ["Mídia de perfil", loadErrors.storage || loadErrors.all || isLoading ? "—" : storage?.profiles.files || 0],
  ].map(([label, value]) => <div key={label} className="border border-white/10 bg-[#0e0f14] p-4"><strong className="font-heading text-2xl text-white">{value}</strong><p className="mt-1 text-xs text-gray-500">{label}</p></div>)}</div>{message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}{loadErrors.all && <p role="alert" className="mt-4 text-sm text-red-300">{loadErrors.all}</p>}
  {Object.keys(loadErrors).length > 0 && <button type="button" onClick={() => void load()} className="mt-4 min-h-11 rounded border border-brand-orange/50 px-4 text-xs font-bold text-brand-orange hover:bg-brand-orange/10">Tentar carregar novamente</button>}
  <div className="mt-6 grid gap-6 xl:grid-cols-2"><Panel title="Saúde editorial">{loadErrors.posts && <p role="alert" className="text-sm text-red-300">{loadErrors.posts}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando matérias...</p>}{!loadErrors.posts && !loadErrors.all && !isLoading && issues.length === 0 && <p className="text-sm text-gray-400">Nenhum alerta editorial encontrado.</p>}{!loadErrors.posts && !loadErrors.all && !isLoading && issues.slice(0, 20).map(({ post, warnings }) => <div key={post.id} className="flex items-center justify-between gap-3 border-t border-white/10 py-3"><Link href={`/admin/edit?id=${post.id}`} className="min-w-0 flex-1"><strong className="text-sm text-white">{post.title}</strong><p className="mt-1 text-xs text-amber-300">{warnings.join(" · ")}</p></Link><button onClick={() => setArchiveCandidate(post)} className="min-h-9 shrink-0 px-2 text-xs font-bold text-red-300 hover:text-white">Arquivar</button></div>)}</Panel>
  <Panel title="Armazenamento">{loadErrors.storage && <p role="alert" className="text-sm text-red-300">{loadErrors.storage}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando armazenamento...</p>}{!loadErrors.all && storage && <div className="space-y-3 text-sm"><p className="flex justify-between"><span>Biblioteca editorial</span><strong>{formatBytes(storage.editorial.bytes)}</strong></p><p className="flex justify-between"><span>Fotos e banners de perfil</span><strong>{formatBytes(storage.profiles.bytes)}</strong></p><p className="flex justify-between"><span>Possíveis arquivos editoriais órfãos</span><strong className="text-amber-300">{storage.possibleEditorialOrphans}</strong></p>{storage.orphans.slice(0, 8).map((file) => <div key={file.path} className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="min-w-0 truncate text-xs text-gray-400">{file.path}</span><button onClick={() => void deleteOrphan(file.path)} className="min-h-9 shrink-0 px-2 text-xs font-bold text-red-300">Remover</button></div>)}<p className="text-xs leading-relaxed text-gray-500">Mídia de perfil permanece separada e nunca aparece na biblioteca editorial.</p></div>}</Panel>
  <Panel title="Lixeira recuperável">{loadErrors.trash && <p role="alert" className="text-sm text-red-300">{loadErrors.trash}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando lixeira...</p>}{!loadErrors.trash && !loadErrors.all && !isLoading && (trash.length === 0 ? <p className="text-sm text-gray-500">Nenhum conteúdo arquivado.</p> : trash.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-white/10 py-3"><div><strong className="text-sm text-white">{String(item.snapshot.title || item.content_id)}</strong><p className="text-xs text-gray-500">Expira em {new Date(item.expires_at).toLocaleDateString("pt-BR")}</p></div><button onClick={() => void restore(item.id)} className="min-h-9 border border-brand-orange/50 px-3 text-xs font-bold text-brand-orange">Restaurar</button></div>))}</Panel>
  <Panel title="Notas da comunidade">{loadErrors.notes && <p role="alert" className="text-sm text-red-300">{loadErrors.notes}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando notas...</p>}{!loadErrors.notes && !loadErrors.all && !isLoading && (notes.length === 0 ? <p className="text-sm text-gray-500">Nenhuma nota aguardando revisão.</p> : notes.map((note) => <div key={note.id} className="border-t border-white/10 py-3"><p className="text-sm leading-relaxed text-gray-200">{note.content}</p><div className="mt-2 flex flex-wrap items-center gap-2"><a href={note.source_url} target="_blank" rel="noreferrer" className="min-h-9 px-2 py-2 text-xs font-bold text-brand-orange">Ver fonte ↗</a><button onClick={() => void moderateNote(note.id, "helpful")} className="min-h-9 border border-emerald-400/40 px-3 text-xs font-bold text-emerald-300">Aprovar</button><button onClick={() => void moderateNote(note.id, "rejected")} className="min-h-9 border border-red-400/30 px-3 text-xs font-bold text-red-300">Rejeitar</button></div></div>))}</Panel>
  <Panel title="Monitoramento operacional">{loadErrors.events && <p role="alert" className="text-sm text-red-300">{loadErrors.events}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando monitoramento...</p>}{!loadErrors.events && !loadErrors.all && !isLoading && (appErrors.length === 0 ? <p className="text-sm text-emerald-300">Nenhuma falha recente registrada.</p> : appErrors.map((error) => <div key={error.id} className="border-t border-white/10 py-3"><div className="flex justify-between gap-3"><strong className="text-xs text-red-300">{error.source}</strong><time className="text-xs text-gray-500">{new Date(error.created_at).toLocaleString("pt-BR")}</time></div><p className="mt-1 text-xs leading-relaxed text-gray-300">{error.message}</p>{error.route && <p className="mt-1 font-mono text-xs text-gray-500">{error.route}</p>}</div>))}</Panel>
  <AutomationPanel automation={automation} error={loadErrors.automation} isLoading={isLoading} />
  <Panel title="Auditoria recente">{loadErrors.audit && <p role="alert" className="text-sm text-red-300">{loadErrors.audit}</p>}{isLoading && <p className="text-sm text-gray-400">Carregando auditoria...</p>}{!loadErrors.audit && !loadErrors.all && !isLoading && audit.length === 0 && <p className="text-sm text-gray-400">Nenhuma ação administrativa recente.</p>}{!loadErrors.audit && !loadErrors.all && !isLoading && audit.map((item) => <div key={item.id} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-white/10 py-3 text-xs"><time className="text-gray-500">{new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time><p><strong className="text-white">{item.action}</strong> <span className="text-gray-500">{item.target_type} {item.target_id}</span></p></div>)}</Panel></div>
  {archiveCandidate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setArchiveCandidate(null)}><div role="alertdialog" aria-modal="true" aria-labelledby="archive-title" className="w-full max-w-md border border-white/10 bg-[#0e0f14] p-6"><p className="text-xs font-black uppercase tracking-widest text-red-300">Mover para a lixeira</p><h2 id="archive-title" className="mt-2 font-heading text-xl font-black text-white">Arquivar esta matéria?</h2><p className="mt-3 text-sm leading-relaxed text-white">“{archiveCandidate.title}” deixará de aparecer no site e poderá ser restaurada por 30 dias.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setArchiveCandidate(null)} className="min-h-11 px-4 text-xs font-bold text-white">Cancelar</button><button onClick={() => void archivePost()} className="min-h-11 bg-red-500 px-4 text-xs font-black text-white">Arquivar matéria</button></div></div></div>}
  </AdminShell>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-white/10 bg-[#0e0f14] p-5"><h2 className="mb-3 font-heading text-lg font-black text-white">{title}</h2>{children}</section>; }

function AutomationPanel({ automation, error, isLoading }: { automation: AutomationStatus | null; error?: string; isLoading: boolean }) {
  return <Panel title="Publicações automáticas">
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {isLoading && <p className="text-sm text-gray-400">Carregando horários...</p>}
    {!error && automation?.ready && <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-400">{automation.date} · horário de Brasília</p>
      {automation.slots?.map((slot) => <div key={slot.hour} className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <strong className="text-white">{slot.hour}h</strong>
        <div className="text-right">
          <p className={slot.state === "failed" || slot.state === "missing" || slot.state === "stalled" ? "text-amber-300" : slot.state.startsWith("published:") ? "text-emerald-300" : "text-gray-300"}>{slotLabel(slot.state)}</p>
          {slot.updatedAt && <time dateTime={slot.updatedAt} className="text-xs text-gray-500">Atualizado às {new Date(slot.updatedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}</time>}
        </div>
      </div>)}
      <p className="border-t border-white/10 pt-3 text-xs text-gray-300">Avisos do Telegram pendentes ou em envio: <strong className={automation.pendingNotices ? "text-amber-300" : "text-emerald-300"}>{automation.pendingNotices}</strong></p>
      <p className="text-xs leading-relaxed text-gray-500">Sem registro após a janela do horário indica que o agendador precisa ser verificado.</p>
    </div>}
  </Panel>;
}
