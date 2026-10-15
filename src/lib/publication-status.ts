export type DeliveryState = "not_requested" | "queued" | "sending" | "received" | "failed" | "unknown" | "cancelled" | "unavailable";
export type DeliveryStatus = { state: DeliveryState; label: string; canRetry: boolean; updatedAt: string | null; detail: string; url?: string };
export type TelegramNotice = { value: string; updated_at: string };
export type YouTubeDelivery = { status: string; updated_at: string; video_id: string | null; visibility: string };

export function telegramDelivery(notice: TelegramNotice | null, now = Date.now()): DeliveryStatus {
  const base = { canRetry: false, updatedAt: notice?.updated_at || null, detail: "Aviso de publicação enviado ao administrador." };
  if (!notice) return { ...base, state: "not_requested", label: "Não solicitado" };
  if (notice.value === "sent") return { ...base, state: "received", label: "Enviado" };
  if (notice.value === "pending") return { ...base, state: "queued", label: "Na fila" };
  if (notice.value === "failed") return { ...base, state: "failed", label: "Falhou", canRetry: true, detail: "O Telegram recusou o aviso. Confira a configuração antes de tentar novamente." };
  if (notice.value === "cancelled") return { ...base, state: "cancelled", label: "Cancelado" };
  if (notice.value.startsWith("sending:") && now - Date.parse(notice.updated_at) < 120_000) return { ...base, state: "sending", label: "Enviando" };
  return { ...base, state: "unknown", label: "A confirmar", detail: "Confira a conversa do administrador no Telegram. Não repita o envio enquanto o resultado for incerto." };
}

export function youtubeDelivery(publication: YouTubeDelivery | null, now = Date.now()): DeliveryStatus {
  const base = { canRetry: false, updatedAt: publication?.updated_at || null, detail: "Último envio registrado para esta matéria." };
  if (!publication) return { ...base, state: "not_requested", label: "Não solicitado" };
  if (publication.status === "uploaded") {
    const visibility = { private: "privado", unlisted: "não listado", public: "público" }[publication.visibility] || "conforme a configuração do envio";
    return { ...base, state: "received", label: "Recebido pelo YouTube", detail: `Enviado como ${visibility}. Confira o processamento e a disponibilidade no YouTube Studio.`, url: publication.video_id && /^[\w-]{11}$/.test(publication.video_id) ? `https://www.youtube.com/watch?v=${publication.video_id}` : undefined };
  }
  if (publication.status === "failed" || publication.status === "preparing" && now - Date.parse(publication.updated_at) >= 600_000) return { ...base, state: "failed", label: "Falhou", canRetry: true, detail: "A preparação falhou antes do envio. Revise o vídeo e as configurações para tentar novamente." };
  if (publication.status === "preparing") return { ...base, state: "queued", label: "Preparando envio" };
  if (publication.status === "uploading" && now - Date.parse(publication.updated_at) < 600_000) return { ...base, state: "sending", label: "Enviando" };
  return { ...base, state: "unknown", label: "A confirmar", detail: "Confira o YouTube Studio antes de qualquer nova tentativa, para evitar duplicação." };
}

export function unavailableDelivery(): DeliveryStatus {
  return { state: "unavailable", label: "Consulta indisponível", canRetry: false, updatedAt: null, detail: "Atualize o acompanhamento antes de tomar uma ação." };
}

export async function confirmedTelegramDelivery(send: () => Promise<{ ok: boolean; error_code?: number }>): Promise<"sent" | "failed" | "unknown"> {
  try {
    const result = await send();
    if (result.ok) return "sent";
    return result.error_code && result.error_code >= 400 && result.error_code < 500 ? "failed" : "unknown";
  } catch { return "unknown"; }
}
