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

export default function AdminHealthPage() {
  const supabase = useMemo(() => createDataClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [storage, setStorage] = useState<StorageHealth | null>(null);
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [appErrors, setAppErrors] = useState<AppError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<Post | null>(null);

  const load = useCallback(async () => {
    const [{ data: postData }, { data: trashData }, { data: auditData }, { data: noteData }, { data: errorData }, { data: { session } }] = await Promise.all([
      supabase.from("posts").select("*").order("updated_at", { ascending: false }),
      supabase.from("admin_trash").select("*").is("restored_at", null).order("deleted_at", { ascending: false }),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("community_notes").select("id, content, source_url, status, created_at").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("app_error_events").select("id, source, message, route, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.auth.getSession(),
    ]);
    setPosts((postData || []) as Post[]); setTrash((trashData || []) as unknown as TrashItem[]); setAudit((auditData || []) as AuditItem[]); setNotes((noteData || []) as CommunityNote[]); setAppErrors((errorData || []) as AppError[]);
    if (session) { const response = await fetch("/api/admin/storage-health", { headers: { Authorization: `Bearer ${session.access_token}` } }); if (response.ok) setStorage(await response.json()); }
  }, [supabase]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const issues = posts.map((post) => ({ post, warnings: [!post.image_url && "Sem imagem de capa", (!Array.isArray(post.editorial_sources) || post.editorial_sources.length === 0) && "Sem fontes estruturadas", post.title.length > 70 && "Título acima de 70 caracteres", post.summary.length < 80 && "Resumo curto"].filter(Boolean) as string[] })).filter((item) => item.warnings.length);
  async function restore(id: string) { const { error } = await supabase.rpc("admin_restore_post", { target_trash_id: id }); setMessage(error ? "Não foi possível restaurar." : "Matéria restaurada."); await load(); }
  async function moderateNote(id: string, status: "helpful" | "rejected") { const { error } = await supabase.from("community_notes").update({ status }).eq("id", id); setMessage(error ? "Não foi possível revisar a nota." : status === "helpful" ? "Nota aprovada." : "Nota rejeitada."); await load(); }
  async function archivePost() { if (!archiveCandidate) return; const { error } = await supabase.rpc("admin_archive_post", { target_post_id: archiveCandidate.id }); setMessage(error ? "Não foi possível arquivar a matéria." : "Matéria movida para a lixeira por 30 dias."); setArchiveCandidate(null); await load(); }
  async function deleteOrphan(path: string) { const { data: { session } } = await supabase.auth.getSession(); if (!session) return; const response = await fetch("/api/admin/storage-health", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ paths: [path] }) }); setMessage(response.ok ? "Arquivo órfão removido." : "Não foi possível remover o arquivo."); await load(); }
  const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return <AdminShell active="health" title="Saúde e auditoria" description="Riscos editoriais, recuperação, ações administrativas e uso de armazenamento."><div className="grid gap-4 md:grid-cols-4">{[
    ["Alertas editoriais", issues.length], ["Notas aguardando revisão", notes.length], ["Itens na lixeira", trash.length], ["Mídia de perfil", storage?.profiles.files || 0],
  ].map(([label, value]) => <div key={label} className="border border-white/10 bg-[#0e0f14] p-4"><strong className="font-heading text-2xl text-white">{value}</strong><p className="mt-1 text-xs text-gray-500">{label}</p></div>)}</div>{message && <p role="status" className="mt-4 text-xs text-gray-300">{message}</p>}
  <div className="mt-6 grid gap-6 xl:grid-cols-2"><Panel title="Saúde editorial">{issues.slice(0, 20).map(({ post, warnings }) => <div key={post.id} className="flex items-center justify-between gap-3 border-t border-white/10 py-3"><Link href={`/admin/edit?id=${post.id}`} className="min-w-0 flex-1"><strong className="text-sm text-white">{post.title}</strong><p className="mt-1 text-xs text-amber-300">{warnings.join(" · ")}</p></Link><button onClick={() => setArchiveCandidate(post)} className="min-h-9 shrink-0 px-2 text-xs font-bold text-red-300 hover:text-white">Arquivar</button></div>)}</Panel>
  <Panel title="Armazenamento">{storage && <div className="space-y-3 text-sm"><p className="flex justify-between"><span>Biblioteca editorial</span><strong>{formatBytes(storage.editorial.bytes)}</strong></p><p className="flex justify-between"><span>Fotos e banners de perfil</span><strong>{formatBytes(storage.profiles.bytes)}</strong></p><p className="flex justify-between"><span>Possíveis arquivos editoriais órfãos</span><strong className="text-amber-300">{storage.possibleEditorialOrphans}</strong></p>{storage.orphans.slice(0, 8).map((file) => <div key={file.path} className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="min-w-0 truncate text-xs text-gray-400">{file.path}</span><button onClick={() => void deleteOrphan(file.path)} className="min-h-9 shrink-0 px-2 text-xs font-bold text-red-300">Remover</button></div>)}<p className="text-xs leading-relaxed text-gray-500">Mídia de perfil permanece separada e nunca aparece na biblioteca editorial.</p></div>}</Panel>
  <Panel title="Lixeira recuperável">{trash.length === 0 ? <p className="text-sm text-gray-500">Nenhum conteúdo arquivado.</p> : trash.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-t border-white/10 py-3"><div><strong className="text-sm text-white">{String(item.snapshot.title || item.content_id)}</strong><p className="text-[10px] text-gray-500">Expira em {new Date(item.expires_at).toLocaleDateString("pt-BR")}</p></div><button onClick={() => void restore(item.id)} className="min-h-9 border border-brand-orange/50 px-3 text-xs font-bold text-brand-orange">Restaurar</button></div>)}</Panel>
  <Panel title="Notas da comunidade">{notes.length === 0 ? <p className="text-sm text-gray-500">Nenhuma nota aguardando revisão.</p> : notes.map((note) => <div key={note.id} className="border-t border-white/10 py-3"><p className="text-sm leading-relaxed text-gray-200">{note.content}</p><div className="mt-2 flex flex-wrap items-center gap-2"><a href={note.source_url} target="_blank" rel="noreferrer" className="min-h-9 px-2 py-2 text-xs font-bold text-brand-orange">Ver fonte ↗</a><button onClick={() => void moderateNote(note.id, "helpful")} className="min-h-9 border border-emerald-400/40 px-3 text-xs font-bold text-emerald-300">Aprovar</button><button onClick={() => void moderateNote(note.id, "rejected")} className="min-h-9 border border-red-400/30 px-3 text-xs font-bold text-red-300">Rejeitar</button></div></div>)}</Panel>
  <Panel title="Monitoramento operacional">{appErrors.length === 0 ? <p className="text-sm text-emerald-300">Nenhuma falha recente registrada.</p> : appErrors.map((error) => <div key={error.id} className="border-t border-white/10 py-3"><div className="flex justify-between gap-3"><strong className="text-xs text-red-300">{error.source}</strong><time className="text-[10px] text-gray-500">{new Date(error.created_at).toLocaleString("pt-BR")}</time></div><p className="mt-1 text-xs leading-relaxed text-gray-300">{error.message}</p>{error.route && <p className="mt-1 font-mono text-[10px] text-gray-500">{error.route}</p>}</div>)}</Panel>
  <Panel title="Auditoria recente">{audit.map((item) => <div key={item.id} className="grid grid-cols-[6rem_1fr] gap-3 border-t border-white/10 py-3 text-xs"><time className="text-gray-500">{new Date(item.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</time><p><strong className="text-white">{item.action}</strong> <span className="text-gray-500">{item.target_type} {item.target_id}</span></p></div>)}</Panel></div>
  {archiveCandidate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setArchiveCandidate(null)}><div role="alertdialog" aria-modal="true" aria-labelledby="archive-title" className="w-full max-w-md border border-white/10 bg-[#0e0f14] p-6"><p className="text-xs font-black uppercase tracking-widest text-red-300">Mover para a lixeira</p><h2 id="archive-title" className="mt-2 font-heading text-xl font-black text-white">Arquivar esta matéria?</h2><p className="mt-3 text-sm leading-relaxed text-white">“{archiveCandidate.title}” deixará de aparecer no site e poderá ser restaurada por 30 dias.</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setArchiveCandidate(null)} className="min-h-11 px-4 text-xs font-bold text-white">Cancelar</button><button onClick={() => void archivePost()} className="min-h-11 bg-red-500 px-4 text-xs font-black text-white">Arquivar matéria</button></div></div></div>}
  </AdminShell>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-white/10 bg-[#0e0f14] p-5"><h2 className="mb-3 font-heading text-lg font-black text-white">{title}</h2>{children}</section>; }
