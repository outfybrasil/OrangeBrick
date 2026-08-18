import { createClient } from "@supabase/supabase-js";
import type { Post } from "../types/database.ts";
import { generateNewsDraft } from "../ai/gemini-news.ts";

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
  return process.env.TELEGRAM_ADMIN_CHAT_ID || "6057845516";
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://orange-brick.vercel.app";
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

export async function sendPostForApproval(post: Post, wordCount?: number) {
  const adminChatId = getAdminChatId();
  if (!adminChatId) {
    console.warn("TELEGRAM_ADMIN_CHAT_ID não configurado. Impossível enviar notificação para aprovação.");
    return null;
  }

  const siteUrl = getSiteUrl();
  const previewUrl = `${siteUrl}/posts/${post.slug}?preview=true`;
  const countText = wordCount ? ` | 📊 ${wordCount} palavras` : "";

  const safeTitle = escapeHtml(post.title);
  const safeCategory = escapeHtml(post.category.toUpperCase());
  const safeAuthor = escapeHtml(post.author_name || "The Brick");
  const safeSummary = escapeHtml(post.summary || "");

  const caption = `🔥 <b>NOVO RASCUNHO GERADO PELO GEMINI</b>\n\n` +
    `📰 <b>${safeTitle}</b>\n\n` +
    `🏷️ <b>Categoria:</b> #${safeCategory}${countText}\n` +
    `✍️ <b>Autor:</b> ${safeAuthor}\n\n` +
    `📝 <b>Resumo:</b>\n${safeSummary}\n\n` +
    `🔗 <a href="${previewUrl}">Abrir Pré-visualização no Site</a>\n\n` +
    `Toque no botão abaixo para publicar ou descartar:`;

  const inlineKeyboard = [
    [
      { text: "🚀 Publicar no Site", callback_data: `publish:${post.id}` },
      { text: "🗑️ Descartar", callback_data: `discard:${post.id}` },
    ],
    [
      { text: "👁️ Ver no Navegador", url: previewUrl },
    ],
  ];

  if (post.image_url) {
    const photoRes = await sendTelegramApi("sendPhoto", {
      chat_id: adminChatId,
      photo: post.image_url,
      caption,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });

    if (photoRes.ok) {
      return photoRes;
    }
  }

  return sendTelegramApi("sendMessage", {
    chat_id: adminChatId,
    text: caption,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const adminChatId = getAdminChatId();

  if (update.callback_query) {
    const cq = update.callback_query;
    const fromId = String(cq.from?.id);
    const data = cq.data || "";

    if (!adminChatId || fromId !== adminChatId) {
      await sendTelegramApi("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "⛔ Acesso negado. Apenas o administrador pode publicar ou descartar matérias.",
        show_alert: true,
      });
      return;
    }

    const [action, postId] = data.split(":");
    const supabase = getSupabaseAdmin();

    if (action === "publish" && postId) {
      const now = new Date().toISOString();
      const { data: updatedPost, error } = await supabase
        .from("posts")
        .update({
          is_published: true,
          published_at: now,
          updated_at: now,
        })
        .eq("id", postId)
        .select("title, slug")
        .single();

      if (error || !updatedPost) {
        await sendTelegramApi("answerCallbackQuery", {
          callback_query_id: cq.id,
          text: `❌ Erro ao publicar: ${error?.message || "Post não encontrado"}`,
          show_alert: true,
        });
        return;
      }

      await sendTelegramApi("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "🎉 Matéria publicada com sucesso no Orange Brick!",
        show_alert: true,
      });

      const siteUrl = getSiteUrl();
      const liveUrl = `${siteUrl}/posts/${updatedPost.slug}`;

      if (cq.message?.photo) {
        await sendTelegramApi("editMessageCaption", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          caption: `${cq.message.caption || ""}\n\n✅ <b>PUBLICADO NO ORANGE BRICK!</b>\n🔗 <a href="${liveUrl}">${liveUrl}</a>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🎉 Ver Post ao Vivo", url: liveUrl }]],
          },
        });
      } else if (cq.message) {
        await sendTelegramApi("editMessageText", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: `${cq.message.text || ""}\n\n✅ <b>PUBLICADO NO ORANGE BRICK!</b>\n🔗 <a href="${liveUrl}">${liveUrl}</a>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🎉 Ver Post ao Vivo", url: liveUrl }]],
          },
        });
      }
      return;
    }

    if (action === "discard" && postId) {
      try {
        const { error } = await supabase.from("posts").delete().eq("id", postId);
        if (error) {
          await sendTelegramApi("answerCallbackQuery", {
            callback_query_id: cq.id,
            text: `❌ Erro ao descartar: ${error.message}`,
            show_alert: true,
          });
          return;
        }

        await sendTelegramApi("answerCallbackQuery", {
          callback_query_id: cq.id,
          text: "🗑️ Rascunho descartado com sucesso!",
          show_alert: true,
        });

        if (cq.message?.photo) {
          await sendTelegramApi("editMessageCaption", {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            caption: `${cq.message.caption || ""}\n\n🗑️ <b>RASCUNHO DESCARTADO</b>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [] },
          });
        } else if (cq.message) {
          await sendTelegramApi("editMessageText", {
            chat_id: cq.message.chat.id,
            message_id: cq.message.message_id,
            text: `${cq.message.text || ""}\n\n🗑️ <b>RASCUNHO DESCARTADO</b>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [] },
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao processar descarte";
        await sendTelegramApi("answerCallbackQuery", {
          callback_query_id: cq.id,
          text: `❌ Falha: ${msg}`,
          show_alert: true,
        });
      }
      return;
    }
  }

  if (update.message?.text) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const fromId = String(msg.from?.id);
    const rawText = msg.text?.trim() || "";
    if (!rawText) return;

    const commandMatch = rawText.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
    const command = commandMatch ? commandMatch[1].toLowerCase() : "";
    const commandArgs = commandMatch && commandMatch[2] ? commandMatch[2].trim() : "";

    if (command === "start" || command === "ajuda" || command === "help") {
      const welcome = `🧱 <b>Bot Editorial Orange Brick</b>\n\n` +
        `Seu Chat ID: <code>${escapeHtml(fromId)}</code>\n\n` +
        `📋 <b>Comandos disponíveis:</b>\n` +
        `• <code>/hoje</code> — Apura e redige a principal matéria de games do dia.\n` +
        `• <code>/gerar &lt;tema&gt;</code> — Redige matéria sobre um jogo ou assunto específico.\n` +
        `• <code>/corrigir [tema | todas]</code> — Corrige e insere 3 imagens 16:9 em matérias sem foto.\n` +
        `• <code>/rascunhos</code> — Lista os últimos rascunhos pendentes de publicação.\n` +
        `• <code>/status</code> — Verifica a conexão com a IA, Supabase e o site.\n` +
        `• Envie qualquer <b>link de notícia</b> para redigir a matéria automaticamente.\n\n` +
        `💡 <i>Para autorizar seu usuário, certifique-se que o Chat ID acima está configurado na variável <code>TELEGRAM_ADMIN_CHAT_ID</code>.</i>`;

      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: welcome,
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

    if (command === "status" || command === "ping") {
      const geminiOk = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_DRIVE_API_KEY);
      let supabaseOk = false;
      let pendingCount = 0;

      try {
        const supabase = getSupabaseAdmin();
        const { count, error } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("is_published", false);
        if (!error) {
          supabaseOk = true;
          pendingCount = count || 0;
        }
      } catch {
        supabaseOk = false;
      }

      const statusMsg = `🧱 <b>Status do Sistema — Orange Brick</b>\n\n` +
        `🤖 <b>Gemini IA:</b> ${geminiOk ? "✅ Conectado" : "❌ Chave ausente"}\n` +
        `🗄️ <b>Supabase DB:</b> ${supabaseOk ? "✅ Operacional" : "❌ Erro de conexão"}\n` +
        `📝 <b>Rascunhos pendentes:</b> ${pendingCount}\n` +
        `🌐 <b>Site:</b> <a href="${getSiteUrl()}">${getSiteUrl()}</a>\n` +
        `👤 <b>Admin ID:</b> <code>${adminChatId}</code>`;

      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: statusMsg,
        parse_mode: "HTML",
      });
      return;
    }

    if (command === "rascunhos" || command === "pendentes" || command === "drafts") {
      try {
        const supabase = getSupabaseAdmin();
        const { data: drafts, error } = await supabase
          .from("posts")
          .select("id, title, slug, category, created_at")
          .eq("is_published", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error || !drafts || drafts.length === 0) {
          await sendTelegramApi("sendMessage", {
            chat_id: chatId,
            text: "📝 Não há rascunhos pendentes de aprovação no momento.",
            parse_mode: "HTML",
          });
          return;
        }

        const siteUrl = getSiteUrl();
        let listText = `📋 <b>Últimos rascunhos pendentes (${drafts.length}):</b>\n\n`;
        drafts.forEach((d, idx) => {
          const previewUrl = `${siteUrl}/posts/${d.slug}?preview=true`;
          listText += `${idx + 1}. <b>${escapeHtml(d.title)}</b>\n   🏷️ #${escapeHtml(d.category.toUpperCase())} | <a href="${previewUrl}">Ver Prévia</a>\n\n`;
        });

        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: listText,
          parse_mode: "HTML",
        });
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro ao listar rascunhos";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao buscar rascunhos: ${escapeHtml(msgErr)}`,
          parse_mode: "HTML",
        });
      }
      return;
    }

    if (command === "corrigir" || command === "fix") {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "🛠️ <b>Iniciando correção e busca de imagens em alta definição...</b>\nAguarde alguns instantes enquanto processo as fotos.",
        parse_mode: "HTML",
      });

      try {
        const { fixPostImages } = await import("../ai/gemini-news.ts");
        const fixedPosts = await fixPostImages(commandArgs || undefined);

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
          text: `🎉 <b>Correção concluída com sucesso!</b>\nForam corrigidas <b>${fixedPosts.length}</b> matéria(s) com capa e 2 imagens internas em 16:9.`,
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
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "🤖 <b>Gemini pesquisando as notícias mais importantes do dia...</b>\nAguarde cerca de 20 a 30 segundos enquanto busco fontes e imagens.",
        parse_mode: "HTML",
      });

      try {
        const result = await generateNewsDraft();
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
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
      if (!commandArgs) {
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: "⚠️ <b>Informe o tema ou jogo.</b>\n\nExemplo:\n<code>/gerar Trailer de revelação do GTA 6</code>\n<code>/gerar PlayStation 6 especificações e lançamento</code>",
          parse_mode: "HTML",
        });
        return;
      }

      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🤖 <b>Gemini redigindo matéria sobre:</b>\n"<i>${escapeHtml(commandArgs)}</i>"...\nAguarde um instante.`,
        parse_mode: "HTML",
      });

      try {
        const result = await generateNewsDraft({ topic: commandArgs });
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar matéria:\n<code>${escapeHtml(msgErr)}</code>`,
          parse_mode: "HTML",
        });
      }
      return;
    }

    if (/^https?:\/\//i.test(rawText)) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🤖 <b>Gemini analisando a URL e gerando a matéria com fotos oficiais...</b>\nAguarde cerca de 20 segundos.`,
        parse_mode: "HTML",
      });

      try {
        const result = await generateNewsDraft({ sourceUrl: rawText });
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar notícia a partir do link:\n<code>${escapeHtml(msgErr)}</code>`,
          parse_mode: "HTML",
        });
      }
      return;
    }

    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: "Envie um link de notícia ou use os comandos:\n• <code>/hoje</code> — Notícia do dia\n• <code>/gerar &lt;tema&gt;</code> — Criar matéria\n• <code>/corrigir [tema | todas]</code> — Corrigir imagens\n• <code>/rascunhos</code> — Ver rascunhos\n• <code>/status</code> — Verificar sistema",
      parse_mode: "HTML",
    });
  }
}
