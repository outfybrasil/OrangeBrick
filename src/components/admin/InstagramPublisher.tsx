"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";
import type { ReelSocialPublication, ReelSocialStatus } from "@/lib/video/reel-social-delivery";

interface InstagramPublisherProps {
  postId: string;
  videoUrl?: string;
  initialCaption: string;
  hashtags?: string[];
  ready: boolean;
  socialPublication?: ReelSocialPublication;
  onDeliveryStatusChange?: (status: ReelSocialStatus, error?: string | null, externalId?: string | null) => void;
}

type InstagramPublisherStatus = "idle" | "sending" | "polling" | "published" | "error";

export function InstagramPublisher({ postId, videoUrl, initialCaption, hashtags = [], ready, socialPublication, onDeliveryStatusChange }: InstagramPublisherProps) {
  const inFlight = useRef(false);
  const supabase = useMemo(() => createDataClient(), []);
  const [caption, setCaption] = useState(initialCaption);
  const [statusOverride, setStatusOverride] = useState<InstagramPublisherStatus | null>(null);
  const [errorOverride, setErrorOverride] = useState<string | null | undefined>(undefined);
  const [publishedMediaIdOverride, setPublishedMediaIdOverride] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configuredOnServer, setConfiguredOnServer] = useState(false);
  const [composioConfigured, setComposioConfigured] = useState(false);
  const [serverAccountId, setServerAccountId] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [customAccountId, setCustomAccountId] = useState("");
  const [isReposting, setIsReposting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const publicationStatus: InstagramPublisherStatus = isReposting && socialPublication?.status === "published"
    ? "idle"
    : socialPublication?.status === "published" ? "published"
      : socialPublication?.status === "processing" ? "polling"
        : socialPublication?.status === "failed" || socialPublication?.status === "unknown" ? "error" : "idle";
  const status = statusOverride ?? publicationStatus;
  const error = errorOverride !== undefined
    ? errorOverride
    : status === "error" ? socialPublication?.error || "Confira o estado da publicação antes de tentar novamente." : null;
  const publishedMediaId = publishedMediaIdOverride ?? socialPublication?.external_id ?? null;

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada. Entre novamente no painel.");
    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedToken = localStorage.getItem("ob_meta_access_token") || "";
        const savedAccountId = localStorage.getItem("ob_ig_account_id") || "";
        if (savedToken) setCustomToken(savedToken);
        if (savedAccountId) setCustomAccountId(savedAccountId);
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, [postId]);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/reels/instagram", {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const data = await response.json();
      if (response.ok) {
        setConfiguredOnServer(Boolean(data.configured));
        setComposioConfigured(Boolean(data.composioConfigured));
        if (data.accountId) setServerAccountId(data.accountId);
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void checkStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [checkStatus]);

  const saveSettings = () => {
    try {
      localStorage.setItem("ob_meta_access_token", customToken.trim());
      localStorage.setItem("ob_ig_account_id", customAccountId.trim());
      setShowConfig(false);
    } catch {}
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleHashtag = (tag: string) => {
    if (caption.includes(tag)) {
      setCaption((prev) => prev.replace(tag, "").replace(/\s{2,}/g, " ").trim());
    } else {
      if (caption.length + tag.length + 1 <= 2200) {
        setCaption((prev) => `${prev.trim()} ${tag}`.trim());
      }
    }
  };

  const isConfigured = configuredOnServer || (Boolean(customToken.trim()) && Boolean(customAccountId.trim()));

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !videoUrl || !ready || status === "sending" || status === "polling" || !confirmed) return;

    inFlight.current = true;
    setStatusOverride("sending");
    setErrorOverride(null);
    onDeliveryStatusChange?.("processing");
    let deliveryStatus: ReelSocialStatus = "unknown";

    try {
      const res = await fetch("/api/admin/reels/instagram", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          repost: isReposting,
          confirmed,
          videoUrl,
          caption,
          accessToken: customToken.trim() || undefined,
          accountId: customAccountId.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        deliveryStatus = data?.deliveryStatus === "unknown" ? "unknown" : "failed";
        throw new Error(data?.error || "Erro ao publicar no Instagram.");
      }

      const mediaId = data?.mediaId || "ok";
      deliveryStatus = "published";
      setStatusOverride("published");
      setPublishedMediaIdOverride(mediaId);
      setIsReposting(false);
      setConfirmed(false);
      onDeliveryStatusChange?.("published", null, mediaId);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha na comunicação com o Instagram.";
      setStatusOverride("error");
      setErrorOverride(message);
      onDeliveryStatusChange?.(deliveryStatus, message);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-xs font-black text-white">
            IG
          </span>
          <div>
            <p className="font-bold text-white">Instagram Reels</p>
            <p className="text-xs text-gray-400">
              {composioConfigured ? (
                <span className="text-emerald-400">● Conectado via Composio</span>
              ) : isConfigured ? (
                <span className="text-emerald-400">● Conexão Meta Graph API pronta</span>
              ) : (
                <span className="text-amber-400">● Requer Composio / Token ou postagem manual</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {showConfig ? "Ocultar Chaves" : "Configurar API"}
        </button>
      </div>

      {showConfig && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-3">
          <p className="text-xs font-bold text-purple-200">Configurações da Meta Graph API (Instagram)</p>
          <div>
            <label className="text-[11px] font-bold text-gray-300">Instagram Business Account ID:</label>
            <input
              type="text"
              placeholder={serverAccountId || "ex: 17841400000000000"}
              value={customAccountId}
              onChange={(e) => setCustomAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#07080c] px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-300">Meta Access Token (Long-Lived):</label>
            <input
              type="password"
              placeholder={configuredOnServer ? "Definido no servidor (.env)" : "EAABw..."}
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#07080c] px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={saveSettings}
              className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-purple-500"
            >
              Salvar Credenciais
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-200">
          <strong>Falha:</strong> {error}
        </div>
      )}

      {status === "published" && !isReposting ? (
        <div role="status" className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-gray-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">✓</span>
            <p className="font-bold text-emerald-300">Reels publicado no Instagram com sucesso!</p>
          </div>
          <p className="text-xs text-gray-300">
            O vídeo foi enviado para o perfil conectado e o processamento final está sendo concluído pelo Instagram.
          </p>
          {publishedMediaId && (
            <p className="text-xs font-mono text-gray-400">
              Media ID: <span className="text-gray-200 font-bold">{publishedMediaId}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="https://business.facebook.com/latest/reels_composer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center text-xs font-bold text-brand-orange underline underline-offset-4"
            >
              Abrir Meta Business Suite ↗
            </a>
          </div>
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsReposting(true);
                setStatusOverride("idle");
                setErrorOverride(null);
                setPublishedMediaIdOverride(null);
                setConfirmed(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
            >
              🔄 Apagou do perfil? Repostar vídeo no Instagram
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePublish} className="space-y-4">
          {isReposting && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <span>Modo de repostagem ativo. Preencha e confirme o reenvio abaixo.</span>
              <button
                type="button"
                onClick={() => {
                  setIsReposting(false);
                  setStatusOverride(null);
                  setErrorOverride(undefined);
                  setPublishedMediaIdOverride(null);
                }}
                className="font-bold underline hover:text-white"
              >
                Cancelar
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-1.5">
              <label className="text-xs font-bold text-gray-300">Legenda do Reels:</label>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono ${caption.length > 2180 ? "text-amber-400 font-bold" : "text-gray-400"}`}>
                  {caption.length}/2200
                </span>
                <button
                  type="button"
                  onClick={copyCaption}
                  className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-white hover:bg-white/20"
                >
                  {copied ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              maxLength={2200}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setConfirmed(false);
              }}
              className="w-full rounded-xl border border-white/15 bg-[#07080c] p-3 text-xs font-mono leading-relaxed text-gray-100 outline-none focus:border-purple-500"
            />

            {hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400">Hashtags:</span>
                {hashtags.map((tag) => {
                  const active = caption.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        toggleHashtag(tag);
                        setConfirmed(false);
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-mono transition-colors ${
                        active
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                          : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {tag} {active ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex min-h-11 items-start gap-3 text-gray-200">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={status === "sending" || status === "polling" || !isConfigured}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-brand-orange"
            />
            <span className="text-xs">
              {isReposting
                ? "Confirmo que o vídeo anterior foi apagado no Instagram e desejo reenviá-lo agora para o perfil conectado."
                : "Revisei o vídeo e a legenda. Confirmo a publicação no perfil conectado do Instagram."}
            </span>
          </label>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={!ready || status === "sending" || status === "polling" || !confirmed || !caption.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-black uppercase text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "sending"
                ? "Processando no Instagram..."
                : isReposting
                ? "Confirmar e Repostar no Instagram"
                : "Publicar no Instagram (API)"}
            </button>

            <a
              href="https://business.facebook.com/latest/reels_composer"
              target="_blank"
              rel="noopener noreferrer"
              onClick={copyCaption}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/10 hover:text-white"
            >
              Abrir Meta Business Suite ↗
            </a>
          </div>

          <p className="text-[11px] text-gray-400">
            Dica: Ao clicar em &ldquo;Abrir Meta Business Suite&rdquo;, a legenda com as hashtags é copiada automaticamente para sua área de transferência.
          </p>
        </form>
      )}
    </div>
  );
}
