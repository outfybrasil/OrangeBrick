import { createClient } from "@supabase/supabase-js";
import type { Post } from "../types/database.ts";
import { generateNewsDraft, NoFreshTopicError, SimilarTopicError } from "../ai/gemini-news.ts";
import { getSiteUrl } from "../site-url.ts";
import { createPreviewToken } from "../preview-token.ts";

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number | string };
    from?: { id: number | string; first_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from?: { id: number | string };
    message?: {
      message_id: number;
      chat: { id: number | string };
      text?: string;
      caption?: string;
      photo?: unknown;
    };
    data?: string;
  };
}

type InlineKeyboard = Array<Array<{ text: string; callback_data?: string; url?: string }>>;

interface ReportRow {
  id: string;
  reporter_id: string;
  content_type: "post" | "comment";
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface PendingEdit {
  postId: string;
  field: "title" | "summary";
}

const BRT_TZ = "America/Sao_Paulo";
const CATEGORIES: Array<Post["category"]> = ["breaking", "hardware", "industry", "modding", "review", "opinion"];
const CATEGORY_LABELS: Record<string, string> = {
  breaking: "💣 Plantão",
  hardware: "🛠️ Hard News",
  industry: "📡 Radar",
  modding: "🔧 Gambiarra",
  review: "🎮 Review",
  opinion: "🔥 Opinião",
};
const DRAFT_PAGE_SIZE = 5;
const REPORT_PAGE_SIZE = 5;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  }
  return token;
}

function getAdminChatId(): string | null {
  return process.env.TELEGRAM_ADMIN_CHAT_ID || null;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function sendTelegramApi(method: string, body: Record<string, unknown>) {
  const token = getBotToken();
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!data.ok) {
    console.error(`Erro na API do Telegram (${method}):`, data);
  }
  return data;
}

export async function notifyAdmin(html: string): Promise<void> {
  const chatId = getAdminChatId();
  if (!chatId) return;
  await sendTelegramApi("sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML" }).catch(() => {});
}

interface BotCommandDef {
  command: string;
  description: string;
}

const EDITORIAL_COMMANDS: BotCommandDef[] = [
  { command: "hoje", description: "📰 Editorial · apura e redige a matéria do dia" },
  { command: "gerar", description: "📰 Editorial · redige matéria sobre um tema" },
  { command: "rascunhos", description: "📰 Editorial · revisa rascunhos pendentes" },
  { command: "corrigir", description: "📰 Editorial · corrige imagens das matérias" },
  { command: "stats", description: "📰 Editorial · métricas dos últimos 7 dias" },
];

const BRICKBOARD_COMMANDS: BotCommandDef[] = [
  { command: "denuncias", description: "🛡 Brickboard · fila de moderação" },
  { command: "ativos", description: "🛡 Brickboard · bricks recentes" },
  { command: "usuario", description: "🛡 Brickboard · ficha de um usuário (@nick)" },
  { command: "suspender", description: "🛡 Brickboard · suspende usuário (@nick [dias])" },
  { command: "ban", description: "🛡 Brickboard · banimento (@nick [motivo])" },
  { command: "desbanir", description: "🛡 Brickboard · restaura participação (@nick)" },
  { command: "comunidade", description: "🛡 Brickboard · resumo do dia" },
  { command: "enquete", description: "🗳 Enquete · Pergunta | Opção 1 | Opção 2 | Opção 3" },
];

const GENERAL_COMMANDS: BotCommandDef[] = [
  { command: "topicos", description: "🏷 Comunidade · lista tópicos" },
  { command: "novo_topico", description: "🏷 Comunidade · cria tópico (Nome)" },
  { command: "status", description: "⚙️ Sistema · diagnóstico" },
  { command: "cancel", description: "✖️ Cancela edição em andamento" },
];

function normalizeChatId(chatId: string): number | string {
  const parsed = Number(chatId);
  return Number.isFinite(parsed) && chatId.trim() !== "" ? parsed : chatId;
}

export async function registerBotCommands(): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};

  results.public = await sendTelegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "🧱 Iniciar o bot e ver ajuda" },
      { command: "status", description: "⚙️ Diagnóstico do sistema" },
    ],
    scope: { type: "default" },
  });

  const adminChatId = getAdminChatId();
  if (adminChatId) {
    results.admin = await sendTelegramApi("setMyCommands", {
      commands: [...EDITORIAL_COMMANDS, ...BRICKBOARD_COMMANDS, ...GENERAL_COMMANDS],
      scope: { type: "chat", chat_id: normalizeChatId(adminChatId) },
    });
  }

  return results;
}

function sendTyping(chatId: number | string): void {
  void sendTelegramApi("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
}

async function answerToast(cq: { id: string }, text: string, alert = true): Promise<void> {
  await sendTelegramApi("answerCallbackQuery", { callback_query_id: cq.id, text, show_alert: alert });
}

function brtDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BRT_TZ }).format(date);
}

function brtDayStartIso(date = new Date()): string {
  return new Date(`${brtDate(date)}T00:00:00-03:00`).toISOString();
}

function fmtBrt(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRT_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function getState(key: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("bot_state").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function setState(key: string, value: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("bot_state").upsert({ key, value, updated_at: new Date().toISOString() });
}

async function deleteState(key: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("bot_state").delete().eq("key", key);
}

async function loadPost(postId: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  return (data as Post) || null;
}

function previewUrlFor(slug: string): string {
  return `${getSiteUrl()}/posts/${slug}?preview=${createPreviewToken(slug)}`;
}

function wordCount(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function approvalText(post: Post, extra = ""): string {
  const safeTitle = escapeHtml(post.title);
  const safeCategory = CATEGORY_LABELS[post.category] || escapeHtml(post.category.toUpperCase());
  const safeAuthor = escapeHtml(post.author_name || "The Brick");
  const safeSummary = escapeHtml(excerpt(post.summary || "", 300));
  const statusLine = post.scheduled_at ? `\n⏰ <b>Agendado:</b> ${fmtBrt(post.scheduled_at)} (BRT)\n` : "";
  return (
    `📰 <b>${safeTitle}</b>\n\n` +
    `🏷️ ${safeCategory} | 📊 ${wordCount(post.body)} palavras\n` +
    `✍️ ${safeAuthor} | ${fmtBrt(post.created_at)}\n${statusLine}${extra}\n` +
    `📝 <b>Resumo:</b>\n${safeSummary}`
  );
}

function approvalKeyboard(post: Post): InlineKeyboard {
  const previewUrl = previewUrlFor(post.slug);
  return [
    [
      { text: "🚀 Publicar", callback_data: `pub:${post.id}` },
      { text: "🗑 Descartar", callback_data: `del:${post.id}` },
    ],
    [
      { text: "✏️ Título", callback_data: `edt:${post.id}:t` },
      { text: "📝 Resumo", callback_data: `edt:${post.id}:s` },
    ],
    [
      { text: "🏷 Categoria", callback_data: `catm:${post.id}` },
      { text: "⏰ Agendar", callback_data: `schedm:${post.id}` },
    ],
    [{ text: "👁 Prévia no site", url: previewUrl }],
  ];
}

export async function sendPostForApproval(post: Post, _wordCountArg?: number) {
  const adminChatId = getAdminChatId();
  if (!adminChatId) {
    console.warn("TELEGRAM_ADMIN_CHAT_ID não configurado. Impossível enviar notificação para aprovação.");
    return null;
  }

  const caption =
    `🔥 <b>NOVO RASCUNHO</b>\n\n${approvalText(post)}\n\nToque nos botões para revisar, editar ou publicar:`;

  const payload = {
    chat_id: adminChatId,
    caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: approvalKeyboard(post) },
  };

  if (post.image_url) {
    const photoRes = await sendTelegramApi("sendPhoto", { ...payload, photo: post.image_url });
    if (photoRes.ok) return photoRes;
  }

  return sendTelegramApi("sendMessage", {
    chat_id: adminChatId,
    text: caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: approvalKeyboard(post) },
  });
}

async function editCard(
  cq: NonNullable<TelegramUpdate["callback_query"]>,
  text: string,
  keyboard: InlineKeyboard,
): Promise<void> {
  if (!cq.message) return;
  const base = {
    chat_id: cq.message.chat.id,
    message_id: cq.message.message_id,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  };
  if (cq.message.photo) {
    await sendTelegramApi("editMessageCaption", { ...base, caption: text });
  } else {
    await sendTelegramApi("editMessageText", { ...base, text });
  }
}

async function sendDetailCard(chatId: number | string, post: Post): Promise<void> {
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text: `🧾 <b>Cartão da matéria</b>\n\n${approvalText(post)}`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: approvalKeyboard(post) },
  });
}

function categoryMenuKeyboard(postId: string): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    rows.push(CATEGORIES.slice(i, i + 2).map((cat) => ({ text: CATEGORY_LABELS[cat], callback_data: `cat:${postId}:${cat}` })));
  }
  rows.push([{ text: "← Voltar", callback_data: `drw:${postId}` }]);
  return rows;
}

function scheduleMenuKeyboard(postId: string): InlineKeyboard {
  const options: Array<[string, number]> = [
    ["⏱ +15 min", 15],
    ["🕐 +1 hora", 60],
    ["🕒 +3 horas", 180],
    ["📅 Amanhã", 1440],
    ["📅 +2 dias", 2880],
    ["📅 +7 dias", 10080],
  ];
  const rows: InlineKeyboard = [];
  for (let i = 0; i < options.length; i += 2) {
    rows.push(options.slice(i, i + 2).map(([label, mins]) => ({ text: label, callback_data: `sch:${postId}:${mins}` })));
  }
  rows.push([{ text: "← Voltar", callback_data: `drw:${postId}` }]);
  return rows;
}

async function listDraftsPage(chatId: number | string, page: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: drafts, count } = await supabase
    .from("posts")
    .select("id, title, slug, category, created_at", { count: "exact" })
    .eq("is_published", false)
    .order("created_at", { ascending: false })
    .range(page * DRAFT_PAGE_SIZE, page * DRAFT_PAGE_SIZE + DRAFT_PAGE_SIZE - 1);

  if (!drafts || drafts.length === 0) {
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: page === 0 ? "📝 Não há rascunhos pendentes de aprovação no momento." : "📄 Fim da lista.",
      parse_mode: "HTML",
    });
    return;
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / DRAFT_PAGE_SIZE));
  let listText = `📋 <b>Rascunhos pendentes</b> — página ${page + 1}/${totalPages} (${total} no total):\n\n`;
  drafts.forEach((d, idx) => {
    listText += `${idx + 1}. <b>${escapeHtml(excerpt(d.title as string, 70))}</b>\n   🏷️ #${escapeHtml(String(d.category).toUpperCase())} | ${timeAgo(d.created_at as string)} atrás\n`;
  });

  const keyboard: InlineKeyboard = drafts.map((d, idx) => [
    { text: `${idx + 1}. ${excerpt(d.title as string, 45)}`, callback_data: `drw:${d.id}` },
  ]);
  const nav: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) nav.push({ text: "◀️", callback_data: `pgd:${page - 1}` });
  if (page + 1 < totalPages) nav.push({ text: "▶️", callback_data: `pgd:${page + 1}` });
  if (nav.length > 0) keyboard.push(nav);

  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text: listText,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

interface ReportContent {
  author_name: string;
  content: string;
  user_id: string;
  post_id?: string;
}

async function loadReportContent(report: ReportRow): Promise<ReportContent | null> {
  const supabase = getSupabaseAdmin();
  const table = report.content_type === "post" ? "community_posts" : "community_comments";
  const { data } = await supabase.from(table).select("user_id, author_name, content, post_id").eq("id", report.content_id).maybeSingle();
  return (data as ReportContent) || null;
}

function brickboardLink(report: ReportRow): string | null {
  return report.content_type === "post" ? `${getSiteUrl()}/brickboard?post=${report.content_id}` : null;
}

function reportKeyboard(report: ReportRow): InlineKeyboard {
  const rows: InlineKeyboard = [
    [
      { text: "✅ Ignorar", callback_data: `rac:${report.id}:dismiss` },
      { text: "🗑 Apagar", callback_data: `rac:${report.id}:delete` },
    ],
    [
      { text: "⏸ Suspender 7d", callback_data: `rac:${report.id}:suspend_7d` },
      { text: "⛔ Banir", callback_data: `rac:${report.id}:ban` },
    ],
  ];
  const link = brickboardLink(report);
  if (link) rows.push([{ text: "🔗 Abrir no Brickboard", url: link }]);
  return rows;
}

function reportConfirmKeyboard(report: ReportRow, action: string): InlineKeyboard {
  const labels: Record<string, string> = { delete: "🗑 Apagar conteúdo", suspend_7d: "⏸ Suspensão 7 dias", ban: "⛔ Banimento" };
  return [
    [
      { text: `✅ Confirmar: ${labels[action] || action}`, callback_data: `rgo:${report.id}:${action}` },
      { text: "❌ Cancelar", callback_data: `rgc:${report.id}` },
    ],
  ];
}

async function resolveReport(reportId: string, action: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("admin_resolve_community_report", {
    target_report_id: reportId,
    target_action: action,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

const ACTION_PAST: Record<string, string> = {
  dismiss: "ignorada",
  delete: "conteúdo apagado",
  suspend_7d: "autor suspenso por 7 dias",
  ban: "autor banido",
};

async function sendReportDetailView(cq: NonNullable<TelegramUpdate["callback_query"]>, reportId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: report } = await supabase.from("community_reports").select("*").eq("id", reportId).maybeSingle();
  if (!report) {
    await answerToast(cq, "Denúncia não encontrada.");
    return;
  }
  const content = await loadReportContent(report as ReportRow);
  const icon = report.content_type === "post" ? "🧱" : "💬";
  let text =
    `<b>${icon} Denúncia</b> · ${timeAgo(report.created_at)} atrás\n` +
    `⚠️ Motivo: <b>${escapeHtml(report.reason)}</b>\n` +
    `👤 Autor: <b>${escapeHtml(content?.author_name || "?")}</b>\n\n` +
    `${escapeHtml(excerpt(content?.content || "(conteúdo já removido)", 600))}`;
  if (report.status !== "pending") text += `\n\nℹ️ Status atual: <b>${report.status}</b>`;
  await sendTelegramApi("sendMessage", {
    chat_id: cq.message?.chat.id,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: report.status === "pending" ? reportKeyboard(report as ReportRow) : [] },
  });
}

async function listReportsPage(chatId: number | string, page: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: reports, count } = await supabase
    .from("community_reports")
    .select("*", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(page * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE + REPORT_PAGE_SIZE - 1);

  if (!reports || reports.length === 0) {
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: "🛡 Nenhuma denúncia pendente. Brickboard em ordem!",
      parse_mode: "HTML",
    });
    return;
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
  let text = `🛡 <b>Denúncias pendentes</b> — página ${page + 1}/${totalPages} (${total}):\n\n`;
  const keyboard: InlineKeyboard = [];
  for (let idx = 0; idx < reports.length; idx++) {
    const report = reports[idx] as ReportRow;
    const content = await loadReportContent(report);
    const icon = report.content_type === "post" ? "🧱" : "💬";
    text +=
      `${icon} <b>${escapeHtml(content?.author_name || "?")}</b>: ${escapeHtml(excerpt(content?.content || "(removido)", 80))}\n` +
      `   ⚠️ ${escapeHtml(excerpt(report.reason, 60))} · ${timeAgo(report.created_at)} atrás\n\n`;
    keyboard.push([
      { text: `${idx + 1}. ${excerpt(content?.content || "conteúdo removido", 40)}`, callback_data: `rvi:${report.id}` },
    ]);
  }
  const nav: Array<{ text: string; callback_data: string }> = [];
  if (page > 0) nav.push({ text: "◀️", callback_data: `rpt:${page - 1}` });
  if (page + 1 < totalPages) nav.push({ text: "▶️", callback_data: `rpt:${page + 1}` });
  if (nav.length > 0) keyboard.push(nav);

  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

const REPORT_ALERT_LOCK = "tg_report_alert_lock";
const REPORT_ALERT_WATERMARK = "tg_report_alert_watermark";

async function sendSingleReportAlert(report: ReportRow): Promise<void> {
  const content = await loadReportContent(report);
  const icon = report.content_type === "post" ? "🧱 Brick" : "💬 Comentário";
  const text =
    `🚨 <b>NOVA DENÚNCIA NO BRICKBOARD</b>\n\n` +
    `${icon} de <b>${escapeHtml(content?.author_name || "?")}</b>\n` +
    `⚠️ Motivo: <b>${escapeHtml(report.reason)}</b>\n\n` +
    `${escapeHtml(excerpt(content?.content || "(conteúdo removido)", 300))}`;
  await sendTelegramApi("sendMessage", {
    chat_id: getAdminChatId(),
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: reportKeyboard(report) },
  });
}

export async function notifyNewCommunityReports(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !getAdminChatId()) return;
  const supabase = getSupabaseAdmin();
  const now = Date.now();
  const lock = await getState(REPORT_ALERT_LOCK);
  if (lock && now - Number(lock) < 30_000) return;
  await setState(REPORT_ALERT_LOCK, String(now));

  let watermark = await getState(REPORT_ALERT_WATERMARK);
  if (!watermark) {
    await setState(REPORT_ALERT_WATERMARK, new Date().toISOString());
    return;
  }

  const { data: reports } = await supabase
    .from("community_reports")
    .select("*")
    .eq("status", "pending")
    .gt("created_at", watermark)
    .order("created_at", { ascending: true })
    .limit(10);

  for (const report of (reports || []) as ReportRow[]) {
    await sendSingleReportAlert(report).catch(() => {});
    watermark = report.created_at;
    await setState(REPORT_ALERT_WATERMARK, watermark);
  }
}

async function findProfileByTerm(term: string) {
  const supabase = getSupabaseAdmin();
  const clean = term.replace(/^@/, "").trim();
  if (!clean) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, nickname, username, display_name, is_official, community_banned, community_suspended_until, community_moderation_reason, created_at")
    .or(`username.ilike.${clean},nickname.ilike.${clean},display_name.ilike.${clean}`)
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function moderateUser(userId: string, action: "suspend_7d" | "ban" | "restore", days: number, reason?: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("admin_moderate_user", {
    target_user_id: userId,
    target_action: action,
    target_reason: reason ?? null,
    target_days: days,
  });
  return error ? error.message : null;
}

async function userCard(profile: Record<string, unknown>): Promise<string> {
  const supabase = getSupabaseAdmin();
  const userId = profile.user_id as string;
  const [progressRes, bricksRes, commentsRes, actionsRes] = await Promise.all([
    supabase.from("user_progress").select("lifetime_xp, level").eq("user_id", userId).maybeSingle(),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("community_comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("community_moderation_actions").select("id", { count: "exact", head: true }).eq("target_user_id", userId),
  ]);
  const progress = progressRes.data as { lifetime_xp?: number; level?: number } | null;
  const banned = Boolean(profile.community_banned);
  const suspendedUntil = profile.community_suspended_until as string | null;
  const suspendedActive = suspendedUntil && new Date(suspendedUntil) > new Date();
  const status = banned ? "⛔ BANIDO" : suspendedActive ? `⏸ Suspenso até ${fmtBrt(suspendedUntil!)}` : "✅ Regular";
  return (
    `👤 <b>${escapeHtml(String(profile.display_name || profile.nickname))}</b>` +
    (profile.is_official ? " ✔️ oficial" : "") +
    `\n🔖 @${escapeHtml(String(profile.username || profile.nickname))} · membro desde ${fmtBrt(String(profile.created_at))}\n\n` +
    `⭐ XP vitalício: <b>${progress?.lifetime_xp ?? 0}</b> · Nível <b>${progress?.level ?? 1}</b>\n` +
    `🧱 Bricks: <b>${bricksRes.count ?? 0}</b> · 💬 Comentários: <b>${commentsRes.count ?? 0}</b>\n` +
    `🛡 Ações de moderação: <b>${actionsRes.count ?? 0}</b>\n` +
    `Status: <b>${status}</b>` +
    (profile.community_moderation_reason && (banned || suspendedActive) ? `\n📄 Motivo: ${escapeHtml(String(profile.community_moderation_reason))}` : "")
  );
}

async function createPollFromArgs(args: string): Promise<string | null> {
  const parts = args.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3 || parts.length > 7) return null;
  const question = parts[0];
  const options = parts.slice(1);
  if (question.length < 8 || question.length > 200) return null;
  if (options.some((opt) => opt.length < 1 || opt.length > 120)) return null;

  const supabase = getSupabaseAdmin();
  const promptDate = brtDate();
  const expiresAt = new Date(`${promptDate}T23:59:59-03:00`).toISOString();
  await supabase.from("community_polls").update({ is_active: false }).eq("is_active", true).neq("prompt_date", promptDate);
  const payload = {
    question,
    options: options.map((text, index) => ({ id: index, text })),
    prompt_date: promptDate,
    expires_at: expiresAt,
    is_active: true,
  };
  const { data: existing } = await supabase.from("community_polls").select("id").eq("prompt_date", promptDate).maybeSingle();
  const { error } = existing
    ? await supabase.from("community_polls").update(payload).eq("id", existing.id)
    : await supabase.from("community_polls").insert(payload);
  return error ? null : promptDate;
}

function slugifyTopic(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

async function brickDetailView(chatId: number | string, postId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data: post } = await supabase
    .from("community_posts")
    .select("id, author_name, author_username, content, created_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return false;
  const link = `${getSiteUrl()}/brickboard?post=${postId}`;
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text:
      `🧱 <b>${escapeHtml(post.author_name as string)}</b> · ${timeAgo(post.created_at as string)} atrás\n\n` +
      `${escapeHtml(excerpt(post.content as string, 900))}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Abrir no Brickboard", url: link }],
        [
          { text: "🗑 Apagar conteúdo", callback_data: `bdl:${postId}` },
          { text: "❌ Fechar", callback_data: `bdx:${postId}` },
        ],
      ],
    },
  });
  return true;
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const cq = update.callback_query!;
  const fromId = String(cq.from?.id);
  const data = cq.data || "";
  const adminChatId = getAdminChatId();

  if (!adminChatId || fromId !== adminChatId) {
    await sendTelegramApi("answerCallbackQuery", {
      callback_query_id: cq.id,
      text: "⛔ Acesso negado. Apenas o administrador pode usar estes controles.",
      show_alert: true,
    });
    return;
  }

  const [action, arg1, arg2] = data.split(":");
  const supabase = getSupabaseAdmin();

  if (action === "pub" && arg1) {
    const post = await loadPost(arg1);
    if (!post) {
      await answerToast(cq, "Matéria não encontrada.", true);
      return;
    }
    const now = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("posts")
      .update({ is_published: true, published_at: now, scheduled_at: null, updated_at: now })
      .eq("id", arg1)
      .select("title, slug")
      .single();

    if (error || !updated) {
      await answerToast(cq, `❌ Erro ao publicar: ${error?.message || "não encontrado"}`, true);
      return;
    }

    await answerToast(cq, "🎉 Matéria publicada no Orange Brick!", true);
    const liveUrl = `${getSiteUrl()}/posts/${updated.slug}`;
    await editCard(cq, `${approvalText(post)}\n\n✅ <b>PUBLICADO!</b>`, [
      [{ text: "🎉 Ver ao vivo", url: liveUrl }],
      [
        { text: "🚫 Despublicar", callback_data: `unp:${arg1}` },
        { text: "🗑 Apagar", callback_data: `del:${arg1}` },
      ],
    ]);
    return;
  }

  if (action === "unp" && arg1) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("posts")
      .update({ is_published: false, published_at: null, updated_at: now })
      .eq("id", arg1);
    if (error) {
      await answerToast(cq, `❌ Erro: ${error.message}`, true);
      return;
    }
    const post = await loadPost(arg1);
    await answerToast(cq, "🚫 Matéria despublicada — voltou para rascunhos.", true);
    if (post) await editCard(cq, approvalText(post, "\n🚫 <b>DESPUBLICADO</b>"), approvalKeyboard(post));
    return;
  }

  if (action === "drw" && arg1) {
    const post = await loadPost(arg1);
    if (!post) {
      await answerToast(cq, "Rascunho não encontrado (talvez apagado).", true);
      return;
    }
    await answerToast(cq, "Cartão aberto.", false);
    await sendDetailCard(cq.message?.chat.id!, post);
    return;
  }

  if (action === "pgd") {
    await answerToast(cq, "Carregando…", false);
    await listDraftsPage(cq.message?.chat.id!, Number(arg1) || 0);
    return;
  }

  if (action === "del" && arg1) {
    await answerToast(cq, "Confirme o descarte.", false);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n⚠️ <b>Apagar este rascunho?</b>`, [
      [
        { text: "🗑 Sim, apagar", callback_data: `dely:${arg1}` },
        { text: "❌ Não", callback_data: `deln:${arg1}` },
      ],
    ]);
    return;
  }

  if (action === "dely" && arg1) {
    const { data: deleted, error } = await supabase.from("posts").delete().eq("id", arg1).select("id");
    if (error) {
      await answerToast(cq, `❌ Erro ao descartar: ${error.message}`, true);
      return;
    }
    await answerToast(cq, deleted && deleted.length > 0 ? "🗑 Rascunho descartado." : "ℹ️ Já havia sido removido.", true);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n🗑 <b>RASCUNHO DESCARTADO</b>`, []);
    return;
  }

  if (action === "deln" && arg1) {
    const post = await loadPost(arg1);
    await answerToast(cq, "Descarte cancelado.", false);
    if (post) await editCard(cq, approvalText(post), approvalKeyboard(post));
    return;
  }

  if (action === "catm" && arg1) {
    await answerToast(cq, "Escolha a categoria:", false);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}`, categoryMenuKeyboard(arg1));
    return;
  }

  if (action === "cat" && arg1 && arg2 && (CATEGORIES as string[]).includes(arg2)) {
    const { error } = await supabase.from("posts").update({ category: arg2, updated_at: new Date().toISOString() }).eq("id", arg1);
    if (error) {
      await answerToast(cq, `❌ ${error.message}`, true);
      return;
    }
    const post = await loadPost(arg1);
    await answerToast(cq, `🏷 Categoria alterada para ${CATEGORY_LABELS[arg2]}.`, true);
    if (post) await editCard(cq, approvalText(post), approvalKeyboard(post));
    return;
  }

  if (action === "schedm" && arg1) {
    await answerToast(cq, "Escolha o intervalo:", false);
    await editCard(
      cq,
      `${cq.message?.caption || cq.message?.text || ""}\n\n⏰ A publicação acontece no primeiro ciclo do scheduler após o horário escolhido.`,
      scheduleMenuKeyboard(arg1),
    );
    return;
  }

  if (action === "sch" && arg1 && arg2) {
    const minutes = Number(arg2);
    if (!Number.isFinite(minutes) || minutes < 5) {
      await answerToast(cq, "Intervalo inválido.", true);
      return;
    }
    const scheduledAt = new Date(Date.now() + minutes * 60000).toISOString();
    const { error } = await supabase
      .from("posts")
      .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
      .eq("id", arg1);
    if (error) {
      await answerToast(cq, `❌ ${error.message}`, true);
      return;
    }
    const post = await loadPost(arg1);
    await answerToast(cq, `⏰ Agendada para ${fmtBrt(scheduledAt)} (BRT).`, true);
    if (post) {
      await editCard(cq, approvalText(post), [
        [
          { text: "🚀 Publicar agora", callback_data: `pub:${arg1}` },
          { text: "❌ Cancelar agendamento", callback_data: `schx:${arg1}` },
        ],
        [{ text: "← Cartão completo", callback_data: `drw:${arg1}` }],
      ]);
    }
    return;
  }

  if (action === "schx" && arg1) {
    const { error } = await supabase.from("posts").update({ scheduled_at: null, updated_at: new Date().toISOString() }).eq("id", arg1);
    if (error) {
      await answerToast(cq, `❌ ${error.message}`, true);
      return;
    }
    const post = await loadPost(arg1);
    await answerToast(cq, "Agendamento cancelado.", true);
    if (post) await editCard(cq, approvalText(post), approvalKeyboard(post));
    return;
  }

  if (action === "edt" && arg1 && (arg2 === "t" || arg2 === "s")) {
    const post = await loadPost(arg1);
    if (!post) {
      await answerToast(cq, "Rascunho não encontrado.", true);
      return;
    }
    await setState(`tg_edit_${adminChatId}`, JSON.stringify({ postId: arg1, field: arg2 === "t" ? "title" : "summary" }));
    await answerToast(
      cq,
      arg2 === "t"
        ? `Envie o novo título (até 160 caracteres).\nAtual: ${excerpt(post.title, 80)}`
        : `Envie o novo resumo (até 300 caracteres).\nAtual: ${excerpt(post.summary || "", 120)}`,
      true,
    );
    return;
  }

  if (action === "rpt") {
    await answerToast(cq, "Carregando…", false);
    await listReportsPage(cq.message?.chat.id!, Number(arg1) || 0);
    return;
  }

  if (action === "rvi" && arg1) {
    await answerToast(cq, "Abrindo denúncia…", false);
    await sendReportDetailView(cq, arg1);
    return;
  }

  if (action === "rac" && arg1 && arg2) {
    const { data: report } = await supabase.from("community_reports").select("status").eq("id", arg1).maybeSingle();
    if (!report) {
      await answerToast(cq, "Denúncia não encontrada.", true);
      return;
    }
    if (report.status !== "pending") {
      await answerToast(cq, "Esta denúncia já foi resolvida.", true);
      return;
    }
    if (arg2 === "dismiss") {
      const result = await resolveReport(arg1, arg2);
      await answerToast(cq, result.ok ? "✅ Denúncia ignorada." : `❌ ${result.error}`, true);
      if (result.ok) await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n✅ <b>DENÚNCIA IGNORADA</b>`, []);
      return;
    }
    await answerToast(cq, "Confirme a ação.", false);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}`, reportConfirmKeyboard({ id: arg1 } as ReportRow, arg2));
    return;
  }

  if (action === "rgo" && arg1 && arg2) {
    const result = await resolveReport(arg1, arg2);
    await answerToast(cq, result.ok ? `✅ Resolvida: ${ACTION_PAST[arg2]}.` : `❌ ${result.error}`, true);
    if (result.ok) {
      await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n⚖️ <b>RESOLVIDA: ${ACTION_PAST[arg2]?.toUpperCase()}</b>`, []);
    }
    return;
  }

  if (action === "rgc" && arg1) {
    await answerToast(cq, "Cancelado.", false);
    await sendReportDetailView(cq, arg1);
    return;
  }

  if (action === "bvw" && arg1) {
    await answerToast(cq, "Abrindo…", false);
    await brickDetailView(cq.message?.chat.id!, arg1);
    return;
  }

  if (action === "bdl" && arg1) {
    await answerToast(cq, "Apagar este brick e seus comentários?", true);
    await editCard(cq, `${cq.message?.text || ""}\n\n⚠️ <b>Apagar este conteúdo do Brickboard?</b>`, [
      [
        { text: "🗑 Sim, apagar", callback_data: `bdly:${arg1}` },
        { text: "❌ Cancelar", callback_data: `bdln:${arg1}` },
      ],
    ]);
    return;
  }

  if (action === "bdly" && arg1) {
    const { error } = await supabase.from("community_posts").delete().eq("id", arg1);
    await answerToast(cq, error ? `❌ ${error.message}` : "🗑 Conteúdo apagado do Brickboard.", true);
    if (!error) await editCard(cq, `${cq.message?.text || ""}\n\n🗑 <b>APAGADO DO BRICKBOARD</b>`, []);
    return;
  }

  if (action === "bdln" && arg1) {
    await answerToast(cq, "Cancelado.", false);
    await brickDetailView(cq.message?.chat.id!, arg1);
    return;
  }

  if (action === "bdx") {
    await answerToast(cq, "Fechado.", false);
    await editCard(cq, cq.message?.text || "Fechado.", []);
    return;
  }

  if (action === "confirma_gen" && arg1) {
    await answerToast(cq, "Gerando matéria mesmo com similaridade...", false);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n⏳ <b>Gerando matéria...</b>`, []);
    try {
      let result;
      if (arg1 === "hoje") {
        result = await generateNewsDraft({ force: true });
      } else if (arg1 === "gerar" && arg2) {
        const topic = decodeURIComponent(arg2);
        result = await generateNewsDraft({ topic, force: true });
      } else if (arg1 === "url" && arg2) {
        const url = decodeURIComponent(arg2);
        result = await generateNewsDraft({ sourceUrl: url, force: true });
      }
      if (result) {
        await sendPostForApproval(result.post, result.wordCount);
        await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n✅ <b>Matéria gerada com sucesso!</b>`, []);
      }
    } catch (err: unknown) {
      const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
      await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n❌ <b>Falha ao gerar:</b>\n<code>${escapeHtml(msgErr)}</code>`, []);
    }
    return;
  }

  if (action === "cancela_gen") {
    await answerToast(cq, "Geração cancelada.", false);
    await editCard(cq, `${cq.message?.caption || cq.message?.text || ""}\n\n🚫 <b>Geração cancelada pelo administrador.</b>`, []);
    return;
  }

  await sendTelegramApi("answerCallbackQuery", { callback_query_id: cq.id, text: "Ação desconhecida.", show_alert: false });
}

async function cmdStats(chatId: number | string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [publishedTotal, publishedWeek, drafts, scheduled, views, reactions, comments, subscribers] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", true).gte("published_at", weekAgo),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false).not("scheduled_at", "is", null),
    supabase.from("post_views").select("id", { count: "exact", head: true }).gte("viewed_at", weekAgo),
    supabase.from("reactions").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("comments").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
  ]);

  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text:
      `📊 <b>Estatísticas editoriais — últimos 7 dias</b>\n\n` +
      `📰 Matérias publicadas: <b>${publishedWeek.count ?? 0}</b> (${publishedTotal.count ?? 0} no total)\n` +
      `📝 Rascunhos pendentes: <b>${drafts.count ?? 0}</b> · Agendadas: <b>${scheduled.count ?? 0}</b>\n` +
      `👁 Views: <b>${views.count ?? 0}</b>\n` +
      `⚡ Reações: <b>${reactions.count ?? 0}</b> · 💬 Comentários: <b>${comments.count ?? 0}</b>\n` +
      `📬 Assinantes da newsletter: <b>${subscribers.count ?? 0}</b>`,
    parse_mode: "HTML",
  });
}

async function cmdCommunitySummary(chatId: number | string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const dayStart = brtDayStartIso();
  const [members, bricks, comments, pendingReports, suspended, banned, pollToday] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    supabase.from("community_comments").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gt("community_suspended_until", new Date().toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("community_banned", true),
    supabase.from("community_polls").select("id, question").eq("prompt_date", brtDate()).maybeSingle(),
  ]);
  let votesLine = "";
  if (pollToday.data) {
    const { count } = await supabase.from("community_poll_votes").select("id", { count: "exact", head: true }).eq("poll_id", (pollToday.data as { id: string }).id);
    votesLine = `\n🗳 Enquete hoje: <b>${count ?? 0}</b> votos — ${escapeHtml(excerpt((pollToday.data as { question: string }).question, 60))}`;
  }
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text:
      `🧱 <b>Brickboard hoje</b> (${brtDate()})\n\n` +
      `👥 Novos membros: <b>${members.count ?? 0}</b>\n` +
      `🧱 Bricks publicados: <b>${bricks.count ?? 0}</b>\n` +
      `💬 Comentários: <b>${comments.count ?? 0}</b>${votesLine}\n\n` +
      `🛡 Denúncias pendentes: <b>${pendingReports.count ?? 0}</b>\n` +
      `⏸ Suspensos ativos: <b>${suspended.count ?? 0}</b> · ⛔ Banidos: <b>${banned.count ?? 0}</b>`,
    parse_mode: "HTML",
  });
}

async function cmdActiveBricks(chatId: number | string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: posts } = await supabase
    .from("community_posts")
    .select("id, author_name, content, created_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (!posts || posts.length === 0) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: "📭 Nenhum brick publicado ainda.", parse_mode: "HTML" });
    return;
  }
  let text = "🧱 <b>Bricks mais recentes</b>\n\n";
  const keyboard: InlineKeyboard = posts.map((post, idx) => [
    {
      text: `${idx + 1}. ${post.author_name}: ${excerpt(post.content as string, 32)}`,
      callback_data: `bvw:${post.id}`,
    },
  ]);
  posts.forEach((post, idx) => {
    text += `${idx + 1}. <b>${escapeHtml(post.author_name as string)}</b>: ${escapeHtml(excerpt(post.content as string, 90))} · ${timeAgo(post.created_at as string)} atrás\n`;
  });
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function cmdTopics(chatId: number | string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: topics } = await supabase.from("topics").select("id, name, kind, is_active").order("name").limit(40);
  if (!topics || topics.length === 0) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: "📭 Nenhum tópico cadastrado.", parse_mode: "HTML" });
    return;
  }
  const lines = topics.map((t) => `${t.is_active ? "✅" : "⛔"} <b>${escapeHtml(t.name as string)}</b> (<code>${escapeHtml(t.id as string)}</code>· ${t.kind === "game" ? "jogo" : "assunto"})`);
  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
    text: `🏷 <b>Tópicos (${topics.length})</b>\n\n${lines.join("\n")}`,
    parse_mode: "HTML",
  });
}

async function cmdUserLookup(chatId: number | string, term: string): Promise<void> {
  if (!term.trim()) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: "Uso: <code>/usuario @nick</code>", parse_mode: "HTML" });
    return;
  }
  const profile = await findProfileByTerm(term);
  if (!profile) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: `❓ Nenhum usuário encontrado para "${escapeHtml(term)}".`, parse_mode: "HTML" });
    return;
  }
  await sendTelegramApi("sendMessage", { chat_id: chatId, text: await userCard(profile), parse_mode: "HTML" });
}

async function handleCommand(chatId: number | string, command: string, args: string): Promise<void> {
  if (command === "start" || command === "ajuda" || command === "help") {
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text:
        `🧱 <b>Bot Editorial Orange Brick</b>\n\n` +
        `Seu Chat ID: <code>${escapeHtml(String(chatId))}</code>\n\n` +
        `📰 <b>Editorial</b>\n` +
        `• <code>/hoje</code> — apura e redige a matéria principal do dia\n` +
        `• <code>/gerar &lt;tema&gt;</code> — redige matéria sobre um assunto\n` +
        `• Envie um <b>link de notícia</b> para gerar cobertura automática\n` +
        `• <code>/corrigir [tema | todas]</code> — corrige imagens das matérias\n` +
        `• <code>/rascunhos</code> — lista rascunhos com cartão completo\n` +
        `• <code>/stats</code> — números dos últimos 7 dias\n\n` +
        `🛡 <b>Brickboard</b>\n` +
        `• <code>/denuncias</code> — fila de moderação com ações rápidas\n` +
        `• <code>/usuario @nick</code> — ficha completa do usuário\n` +
        `• <code>/suspender @nick [dias]</code> — padrão 7 dias\n` +
        `• <code>/ban @nick [motivo]</code> — banimento\n` +
        `• <code>/desbanir @nick</code> — restaura participação\n` +
        `• <code>/ativos</code> — bricks recentes com opção de apagar\n` +
        `• <code>/comunidade</code> — resumo do dia\n\n` +
        `🗳 <b>Comunidade</b>\n` +
        `• <code>/enquete Pergunta | Opção 1 | Opção 2 | Opção 3</code>\n` +
        `• <code>/topicos</code> — lista tópicos\n` +
        `• <code>/novo_topico Nome do Tópico</code>\n\n` +
        `• <code>/status</code> — diagnóstico do sistema\n` +
        `• <code>/cancel</code> — cancela edição em andamento`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "status" || command === "ping") {
    const geminiOk = Boolean(process.env.GEMINI_API_KEY);
    let supabaseOk = false;
    let pendingCount = 0;
    let pendingReports = 0;
    try {
      const supabase = getSupabaseAdmin();
      const [draftsRes, reportsRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_published", false),
        supabase.from("community_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      supabaseOk = !draftsRes.error && !reportsRes.error;
      pendingCount = draftsRes.count || 0;
      pendingReports = reportsRes.count || 0;
    } catch {
      supabaseOk = false;
    }
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text:
        `🧱 <b>Status do Sistema — Orange Brick</b>\n\n` +
        `🤖 <b>Gemini IA:</b> ${geminiOk ? "✅ Conectado" : "❌ Chave ausente"}\n` +
        `🗄️ <b>Supabase DB:</b> ${supabaseOk ? "✅ Operacional" : "❌ Erro de conexão"}\n` +
        `📝 <b>Rascunhos pendentes:</b> ${pendingCount}\n` +
        `🛡 <b>Denúncias abertas:</b> ${pendingReports}\n` +
        `🌐 <b>Site:</b> <a href="${getSiteUrl()}">${getSiteUrl()}</a>\n` +
        `👤 <b>Admin ID:</b> <code>${getAdminChatId() || "não configurado"}</code>`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "rascunhos" || command === "pendentes" || command === "drafts") {
    sendTyping(chatId);
    await listDraftsPage(chatId, Math.max(0, parseInt(args, 10) - 1 || 0));
    return;
  }

  if (command === "stats") {
    sendTyping(chatId);
    await cmdStats(chatId);
    return;
  }

  if (command === "denuncias" || command === "reports") {
    sendTyping(chatId);
    await listReportsPage(chatId, Math.max(0, parseInt(args, 10) - 1 || 0));
    return;
  }

  if (command === "usuario" || command === "user") {
    await cmdUserLookup(chatId, args);
    return;
  }

  if (command === "suspender") {
    const parts = args.split(/\s+/).filter(Boolean);
    const nick = parts[0];
    const days = Math.min(90, Math.max(1, parseInt(parts[1] || "7", 10) || 7));
    if (!nick) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "Uso: <code>/suspender @nick [dias]</code>", parse_mode: "HTML" });
      return;
    }
    const profile = await findProfileByTerm(nick);
    if (!profile) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "❓ Usuário não encontrado.", parse_mode: "HTML" });
      return;
    }
    const err = await moderateUser(profile.user_id as string, "suspend_7d", days, `Suspensão manual pelo Telegram (${days}d)`);
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: err ? `❌ ${escapeHtml(err)}` : `⏸ <b>@${escapeHtml(String(profile.username || profile.nickname))}</b> suspenso por ${days} dia(s).`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "ban") {
    const parts = args.split(/\s+/);
    const nick = parts.shift();
    const reason = parts.join(" ").trim() || undefined;
    if (!nick) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "Uso: <code>/ban @nick [motivo]</code>", parse_mode: "HTML" });
      return;
    }
    const profile = await findProfileByTerm(nick);
    if (!profile) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "❓ Usuário não encontrado.", parse_mode: "HTML" });
      return;
    }
    const err = await moderateUser(profile.user_id as string, "ban", 7, reason || "Banimento manual pelo Telegram");
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: err ? `❌ ${escapeHtml(err)}` : `⛔ <b>@${escapeHtml(String(profile.username || profile.nickname))}</b> foi banido do Brickboard.`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "desbanir") {
    const nick = args.split(/\s+/)[0];
    if (!nick) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "Uso: <code>/desbanir @nick</code>", parse_mode: "HTML" });
      return;
    }
    const profile = await findProfileByTerm(nick);
    if (!profile) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "❓ Usuário não encontrado.", parse_mode: "HTML" });
      return;
    }
    const err = await moderateUser(profile.user_id as string, "restore", 7);
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: err ? `❌ ${escapeHtml(err)}` : `✅ Participação de <b>@${escapeHtml(String(profile.username || profile.nickname))}</b> restaurada.`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "ativos" || command === "feed") {
    await cmdActiveBricks(chatId);
    return;
  }

  if (command === "comunidade") {
    await cmdCommunitySummary(chatId);
    return;
  }

  if (command === "enquete") {
    if (!args) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text:
          "🗳 <b>Criar a enquete diária</b>\n\nSepare a pergunta e as opções com <code>|</code>:\n<code>/enquete Qual o jogo do ano? | Clair Obscur 33 | GTA VI | Ghost of Yotei</code>",
        parse_mode: "HTML",
      });
      return;
    }
    const result = await createPollFromArgs(args);
    if (!result) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "⚠️ Formato inválido. Use:\n<code>/enquete Pergunta | Opção 1 | Opção 2 | Opção 3 [| Opção 4 | Opção 5 | Opção 6]</code>",
        parse_mode: "HTML",
      });
      return;
    }
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: `🗳 Enquete do dia (${result}) criada e ativada! A anterior foi encerrada.`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "topicos") {
    await cmdTopics(chatId);
    return;
  }

  if (command === "novo-topico" || command === "novo_topico") {
    const name = args.trim();
    if (name.length < 2) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "Uso: <code>/novo-topico Nome do Tópico</code>", parse_mode: "HTML" });
      return;
    }
    const slug = slugifyTopic(name);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: "⚠️ Não consegui gerar um identificador válido desse nome.", parse_mode: "HTML" });
      return;
    }
    const { error } = await getSupabaseAdmin()
      .from("topics")
      .insert({ id: slug, name, kind: "subject", description: `Conversas sobre ${name}.`, is_active: true, updated_at: new Date().toISOString() });
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: error ? `❌ ${escapeHtml(error.message)}` : `🏷 Tópico criado: <b>${escapeHtml(name)}</b> (<code>${escapeHtml(slug)}</code>).`,
      parse_mode: "HTML",
    });
    return;
  }

  if (command === "cancel") {
    await deleteState(`tg_edit_${chatId}`);
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: "✔️ Nada pendente de edição.", parse_mode: "HTML" });
    return;
  }

  if (command === "corrigir" || command === "fix") {
    sendTyping(chatId);
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: "🛠 <b>Iniciando correção e busca de imagens em alta definição...</b>\nAguarde alguns instantes enquanto processo as fotos.",
      parse_mode: "HTML",
    });
    try {
      const { fixPostImages } = await import("../ai/gemini-news.ts");
      const fixedPosts = await fixPostImages(args || undefined);
      if (fixedPosts.length === 0) {
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: "✅ Nenhuma matéria pendente de correção foi encontrada. Todas já possuem imagens válidas!",
          parse_mode: "HTML",
        });
        return;
      }
      for (const post of fixedPosts) {
        await sendPostForApproval(post);
      }
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🎉 <b>Correção concluída!</b>\nForam corrigidas <b>${fixedPosts.length}</b> matéria(s) com capa e imagens internas em 16:9.`,
        parse_mode: "HTML",
      });
    } catch (err: unknown) {
      const msgErr = err instanceof Error ? err.message : "Erro ao corrigir imagens";
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `❌ Falha ao corrigir imagens:\n<code>${escapeHtml(msgErr)}</code>`,
        parse_mode: "HTML",
      });
    }
    return;
  }

  if (command === "hoje" || command === "radar") {
    sendTyping(chatId);
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: "🤖 <b>Gemini pesquisando as notícias mais importantes do dia...</b>\nAguarde cerca de 20 a 30 segundos.",
      parse_mode: "HTML",
    });
    try {
      const result = await generateNewsDraft();
      await sendPostForApproval(result.post, result.wordCount);
    } catch (err: unknown) {
      if (err instanceof SimilarTopicError) {
        const similarList = err.similarTitles.map((t) => `• ${escapeHtml(t)}`).join("\n");
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `⚠️ <b>Atenção: matérias similares já publicadas</b>\n\n${escapeHtml(err.message)}\n\n<b>Matérias encontradas:</b>\n${similarList}\n\nDeseja seguir com a geração mesmo assim?`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Sim, gerar mesmo assim", callback_data: "confirma_gen:hoje:" },
                { text: "❌ Cancelar", callback_data: "cancela_gen:" },
              ],
            ],
          },
        });
        return;
      }
      if (err instanceof NoFreshTopicError) {
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `📭 <b>Nenhuma pauta inédita no momento.</b>\n${escapeHtml(err.message)}\n\nUse <code>/gerar &lt;tema&gt;</code> para cobrir um assunto específico.`,
          parse_mode: "HTML",
        });
        return;
      }
      const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `❌ Falha ao gerar matéria do dia:\n<code>${escapeHtml(msgErr)}</code>`,
        parse_mode: "HTML",
      });
    }
    return;
  }

  if (command === "gerar") {
    if (!args) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "⚠️ <b>Informe o tema ou jogo.</b>\n\nExemplo:\n<code>/gerar Trailer de revelação do GTA 6</code>",
        parse_mode: "HTML",
      });
      return;
    }
    sendTyping(chatId);
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: `🤖 <b>Gemini redigindo matéria sobre:</b>\n"<i>${escapeHtml(args)}</i>"...\nAguarde um instante.`,
      parse_mode: "HTML",
    });
    try {
      const result = await generateNewsDraft({ topic: args });
      await sendPostForApproval(result.post, result.wordCount);
    } catch (err: unknown) {
      if (err instanceof SimilarTopicError) {
        const similarList = err.similarTitles.map((t) => `• ${escapeHtml(t)}`).join("\n");
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `⚠️ <b>Atenção: matérias similares já publicadas</b>\n\n${escapeHtml(err.message)}\n\n<b>Matérias encontradas:</b>\n${similarList}\n\nDeseja seguir com a geração mesmo assim?`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Sim, gerar mesmo assim", callback_data: `confirma_gen:gerar:${encodeURIComponent(args)}` },
                { text: "❌ Cancelar", callback_data: "cancela_gen:" },
              ],
            ],
          },
        });
        return;
      }
      if (err instanceof NoFreshTopicError) {
        await sendTelegramApi("sendMessage", { chat_id: chatId, text: `♻️ <b>Matéria não criada.</b>\n${escapeHtml(err.message)}`, parse_mode: "HTML" });
        return;
      }
      const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
      await sendTelegramApi("sendMessage", { chat_id: chatId, text: `❌ Falha ao gerar matéria:\n<code>${escapeHtml(msgErr)}</code>`, parse_mode: "HTML" });
    }
    return;
  }

  await sendTelegramApi("sendMessage", {
    chat_id: chatId,
      text:
        "Comandos disponíveis:\n• /hoje — Notícia do dia\n• /gerar <tema> — Criar matéria\n• /rascunhos — Revisar rascunhos\n• /denuncias — Moderação do Brickboard\n• /enquete Pergunta | Opt 1 | Opt 2\n• /comunidade — Resumo do dia\n• /stats — Métricas\n• /status — Diagnóstico\n\nDigite / para ver o menu completo de comandos.",
    parse_mode: "HTML",
  });
}

async function consumePendingEdit(chatId: number | string, text: string): Promise<boolean> {
  const stateRaw = await getState(`tg_edit_${chatId}`);
  if (!stateRaw) return false;
  let pending: PendingEdit;
  try {
    pending = JSON.parse(stateRaw) as PendingEdit;
  } catch {
    await deleteState(`tg_edit_${chatId}`);
    return false;
  }
  const value = text.trim();
  const limits: Record<PendingEdit["field"], [number, number]> = { title: [5, 160], summary: [10, 300] };
  const [min, max] = limits[pending.field];
  if (value.length < min || value.length > max) {
    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: `⚠️ Texto deve ter entre ${min} e ${max} caracteres. Tente novamente ou use /cancel.`,
      parse_mode: "HTML",
    });
    return true;
  }
  const field = pending.field === "title" ? "title" : "summary";
  const { error } = await getSupabaseAdmin()
    .from("posts")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", pending.postId);
  await deleteState(`tg_edit_${chatId}`);
  if (error) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: `❌ ${escapeHtml(error.message)}`, parse_mode: "HTML" });
    return true;
  }
  const post = await loadPost(pending.postId);
  if (post) {
    await sendTelegramApi("sendMessage", { chat_id: chatId, text: `✏️ ${field === "title" ? "Título" : "Resumo"} atualizado!`, parse_mode: "HTML" });
    await sendPostForApproval(post);
  }
  return true;
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const adminChatId = getAdminChatId();

  if (update.callback_query) {
    await handleCallback(update);
    return;
  }

  if (update.message?.text) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const fromId = String(msg.from?.id);
    const rawText = msg.text?.trim() || "";
    if (!rawText) return;

    const commandMatch = rawText.match(/^\/([a-zA-Z0-9_-]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
    const command = commandMatch ? commandMatch[1].toLowerCase() : "";
    const commandArgs = commandMatch && commandMatch[2] ? commandMatch[2].trim() : "";

    if (command === "start" || command === "ajuda" || command === "help") {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text:
          `🧱 <b>Bot Editorial Orange Brick</b>\n\n` +
          `Seu Chat ID: <code>${escapeHtml(fromId)}</code>\n\n` +
          `💡 Para autorizar seu acesso, configure este Chat ID na variável <code>TELEGRAM_ADMIN_CHAT_ID</code>.`,
        parse_mode: "HTML",
      });
      return;
    }

    if (!adminChatId || fromId !== adminChatId) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `⛔ <b>Acesso restrito.</b>\nEste bot é de uso privado do administrador do Orange Brick.\n\nSeu Chat ID: <code>${escapeHtml(fromId)}</code>`,
        parse_mode: "HTML",
      });
      return;
    }

    if (command) {
      await handleCommand(chatId, command, commandArgs);
      return;
    }

    if (/^https?:\/\//i.test(rawText)) {
      sendTyping(chatId);
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "🤖 <b>Gemini analisando a URL e gerando a matéria com fotos oficiais...</b>\nAguarde cerca de 20 segundos.",
        parse_mode: "HTML",
      });
      try {
        const result = await generateNewsDraft({ sourceUrl: rawText });
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        if (err instanceof SimilarTopicError) {
          const similarList = err.similarTitles.map((t) => `• ${escapeHtml(t)}`).join("\n");
          await sendTelegramApi("sendMessage", {
            chat_id: chatId,
            text: `⚠️ <b>Atenção: matérias similares já publicadas</b>\n\n${escapeHtml(err.message)}\n\n<b>Matérias encontradas:</b>\n${similarList}\n\nDeseja seguir com a geração mesmo assim?`,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Sim, gerar mesmo assim", callback_data: `confirma_gen:url:${encodeURIComponent(rawText)}` },
                  { text: "❌ Cancelar", callback_data: "cancela_gen:" },
                ],
              ],
            },
          });
          return;
        }
        if (err instanceof NoFreshTopicError) {
          await sendTelegramApi("sendMessage", {
            chat_id: chatId,
            text: `♻️ <b>Matéria não criada: esse assunto já foi coberto.</b>\n${escapeHtml(err.message)}`,
            parse_mode: "HTML",
          });
          return;
        }
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar notícia a partir do link:\n<code>${escapeHtml(msgErr)}</code>`,
          parse_mode: "HTML",
        });
      }
      return;
    }

    const consumed = await consumePendingEdit(chatId, rawText);
    if (consumed) return;

    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text:
        "Envie um link de notícia ou use:\n• /hoje — Notícia do dia\n• /gerar <tema> — Criar matéria\n• /rascunhos — Revisar rascunhos\n• /denuncias — Moderação\n• /comunidade — Resumo do Brickboard\n• /stats — Métricas\n• /status — Diagnóstico",
      parse_mode: "HTML",
    });
  }
}
