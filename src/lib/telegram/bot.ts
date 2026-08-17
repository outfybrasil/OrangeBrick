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

  const caption = `🔥 *NOVO RASCUNHO GERADO PELO GEMINI 2.0*\n\n` +
    `📰 *${post.title}*\n\n` +
    `🏷️ *Categoria:* #${post.category.toUpperCase()}${countText}\n` +
    `✍️ *Autor:* ${post.author_name}\n\n` +
    `📝 *Resumo:*\n${post.summary}\n\n` +
    `🔗 [Abrir Pré-visualização](${previewUrl})\n\n` +
    `Toque no botão abaixo para publicar no Orange Brick:`;

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
    return sendTelegramApi("sendPhoto", {
      chat_id: adminChatId,
      photo: post.image_url,
      caption,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  }

  return sendTelegramApi("sendMessage", {
    chat_id: adminChatId,
    text: caption,
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

export async function handleTelegramWebhook(update: TelegramUpdate) {
  const adminChatId = getAdminChatId();

  // 1. Tratamento de clique nos botões (callback_query)
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
          caption: `${cq.message.caption || ""}\n\n✅ *PUBLICADO NO ORANGE BRICK!*\n🔗 ${liveUrl}`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🎉 Ver Post ao Vivo", url: liveUrl }]],
          },
        });
      } else if (cq.message) {
        await sendTelegramApi("editMessageText", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: `${cq.message.text || ""}\n\n✅ *PUBLICADO NO ORANGE BRICK!*\n🔗 ${liveUrl}`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🎉 Ver Post ao Vivo", url: liveUrl }]],
          },
        });
      }
      return;
    }

    if (action === "discard" && postId) {
      await supabase.from("posts").delete().eq("id", postId);

      await sendTelegramApi("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: "🗑️ Rascunho descartado com sucesso.",
        show_alert: true,
      });

      if (cq.message?.photo) {
        await sendTelegramApi("editMessageCaption", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          caption: `${cq.message.caption || ""}\n\n❌ *RASCUNHO DESCARTADO*`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] },
        });
      } else if (cq.message) {
        await sendTelegramApi("editMessageText", {
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          text: `${cq.message.text || ""}\n\n❌ *RASCUNHO DESCARTADO*`,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] },
        });
      }
      return;
    }
  }

  // 2. Tratamento de mensagens de texto e comandos
  if (update.message?.text) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const fromId = String(msg.from?.id);
    const text = msg.text?.trim() || "";
    if (!text) return;

    if (text === "/start" || text === "/ajuda") {
      const welcome = `🧱 *Bot Editorial Orange Brick*\n\n` +
        `Seu Chat ID: \`${fromId}\`\n\n` +
        `📋 *Comandos disponíveis:*\n` +
        `• Envie qualquer *link de notícia* para redigir a matéria automaticamente.\n` +
        `• \`/gerar <tema>\` — Cria uma matéria completa sobre um jogo ou assunto específico.\n` +
        `• \`/hoje\` — Apura a notícia mais importante do dia e cria o rascunho.\n\n` +
        `💡 *Dica:* Copie o Chat ID acima e cole na variável \`TELEGRAM_ADMIN_CHAT_ID\` no seu \`.env.local\`.`;

      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: welcome,
        parse_mode: "Markdown",
      });
      return;
    }

    if (!adminChatId || fromId !== adminChatId) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "⛔ *Acesso restrito.*\nEste bot é de uso privado do administrador do Orange Brick.",
        parse_mode: "Markdown",
      });
      return;
    }

    if (text === "/hoje" || text === "/radar") {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: "🤖 *Gemini 2.0 pesquisando as notícias mais importantes do dia...*\nAguarde cerca de 20 a 30 segundos enquanto busco fontes e imagens.",
        parse_mode: "Markdown",
      });

      try {
        const result = await generateNewsDraft();
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar matéria do dia: ${msgErr}`,
        });
      }
      return;
    }

    if (text.startsWith("/gerar ")) {
      const topic = text.replace(/^\/gerar\s+/, "").trim();
      if (!topic) {
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Informe o tema. Exemplo: `/gerar GTA 6 trailer 2 adiado`",
          parse_mode: "Markdown",
        });
        return;
      }

      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🤖 *Gemini 2.0 redigindo matéria sobre:*\n"${topic}"...\nAguarde um instante.`,
        parse_mode: "Markdown",
      });

      try {
        const result = await generateNewsDraft({ topic });
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar matéria: ${msgErr}`,
        });
      }
      return;
    }

    // Se o usuário apenas enviou um link de notícia
    if (/^https?:\/\//i.test(text)) {
      await sendTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🤖 *Gemini 2.0 analisando a URL e gerando a matéria com fotos oficiais...*\nAguarde cerca de 20 segundos.`,
        parse_mode: "Markdown",
      });

      try {
        const result = await generateNewsDraft({ sourceUrl: text });
        await sendPostForApproval(result.post, result.wordCount);
      } catch (err: unknown) {
        const msgErr = err instanceof Error ? err.message : "Erro desconhecido";
        await sendTelegramApi("sendMessage", {
          chat_id: chatId,
          text: `❌ Falha ao gerar notícia a partir do link: ${msgErr}`,
        });
      }
      return;
    }

    await sendTelegramApi("sendMessage", {
      chat_id: chatId,
      text: `Envie um link de notícia ou use \`/gerar <tema>\` ou \`/hoje\`.`,
    });
  }
}
