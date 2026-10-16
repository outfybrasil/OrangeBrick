"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDataClient } from "@/lib/supabase/client";

interface TikTokPublisherProps {
  postId: string;
  videoUrl?: string;
  initialCaption: string;
  hashtags?: string[];
  ready: boolean;
}

export function TikTokPublisher({ postId, videoUrl, initialCaption, hashtags = [], ready }: TikTokPublisherProps) {
  const supabase = useMemo(() => createDataClient(), []);
  const [caption, setCaption] = useState(initialCaption);
  const [privacyLevel, setPrivacyLevel] = useState<"PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY">("PUBLIC_TO_EVERYONE");
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "published" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configuredOnServer, setConfiguredOnServer] = useState(false);
  const [composioConfigured, setComposioConfigured] = useState(false);
  const [customToken, setCustomToken] = useState("");
  const [isReposting, setIsReposting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const token = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão expirada. Entre novamente no painel.");
    return session.access_token;
  }, [supabase]);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("ob_tiktok_access_token") || "";
      if (savedToken) setCustomToken(savedToken);
      const savedPub = localStorage.getItem(`ob_tt_pub_${postId}`);
      if (savedPub) {
        const parsed = JSON.parse(savedPub);
        if (parsed?.publishId) {
          setPublishId(parsed.publishId);
          setStatus("published");
        }
      }
    } catch {}
  }, [postId]);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/reels/tiktok", {
        headers: { Authorization: `Bearer ${await token()}` },
      });
      const data = await response.json();
      if (response.ok) {
        setConfiguredOnServer(Boolean(data.configured));
        setComposioConfigured(Boolean(data.composioConfigured));
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void checkStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [checkStatus]);

  const saveSettings = () => {
    try {
      localStorage.setItem("ob_tiktok_access_token", customToken.trim());
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

  const isConfigured = configuredOnServer || Boolean(customToken.trim());

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault();
    if (!videoUrl || !ready || status === "sending" || !confirmed) return;

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/admin/reels/tiktok", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await token()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          videoUrl,
          caption,
          privacyLevel,
          disableComment,
          disableDuet,
          disableStitch,
          accessToken: customToken.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao publicar no TikTok.");
      }

      const finalPublishId = data?.publishId || "ok";
      setStatus("published");
      setPublishId(finalPublishId);
      setIsReposting(false);
      setConfirmed(false);

      try {
        localStorage.setItem(`ob_tt_pub_${postId}`, JSON.stringify({ publishId: finalPublishId, publishedAt: new Date().toISOString() }));
      } catch {}
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Falha na comunicação com o TikTok.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black border border-cyan-400 text-xs font-black text-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.4)]">
            TT
          </span>
          <div>
            <p className="font-bold text-white">TikTok Content Posting</p>
            <p className="text-xs text-gray-400">
              {composioConfigured ? (
                <span className="text-cyan-400">● Conectado via Composio</span>
              ) : isConfigured ? (
                <span className="text-cyan-400">● Conexão TikTok API pronta</span>
              ) : (
                <span className="text-amber-400">● Requer Composio / Token ou upload web</span>
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
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-3">
          <p className="text-xs font-bold text-cyan-200">Configurações da TikTok API (Direct Post)</p>
          <div>
            <label className="text-[11px] font-bold text-gray-300">TikTok Access Token (Bearer):</label>
            <input
              type="password"
              placeholder={configuredOnServer ? "Definido no servidor (.env)" : "act.example_tiktok_token..."}
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#07080c] px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={saveSettings}
              className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-bold text-black transition-colors hover:bg-cyan-500"
            >
              Salvar Credencial
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
        <div role="status" className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 text-gray-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold">✓</span>
            <p className="font-bold text-cyan-300">Vídeo enviado com sucesso para o TikTok!</p>
          </div>
          <p className="text-xs text-gray-300">
            O arquivo foi transferido para o TikTok. O processamento final e a publicação ocorrem diretamente na sua conta/inbox do TikTok.
          </p>
          {publishId && (
            <p className="text-xs font-mono text-gray-400">
              Publish ID: <span className="text-gray-200 font-bold">{publishId}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="https://www.tiktok.com/creator-center/upload"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center text-xs font-bold text-cyan-400 underline underline-offset-4"
            >
              Abrir TikTok Studio Web ↗
            </a>
          </div>
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsReposting(true);
                setConfirmed(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
            >
              🔄 Apagou da conta? Repostar vídeo no TikTok
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
                onClick={() => setIsReposting(false)}
                className="font-bold underline hover:text-white"
              >
                Cancelar
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between pb-1.5">
              <label className="text-xs font-bold text-gray-300">Texto / Hashtags do TikTok:</label>
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
              rows={5}
              maxLength={2200}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setConfirmed(false);
              }}
              className="w-full rounded-xl border border-white/15 bg-[#07080c] p-3 text-xs font-mono leading-relaxed text-gray-100 outline-none focus:border-cyan-400"
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
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-gray-300">Visibilidade do Vídeo:</label>
              <select
                value={privacyLevel}
                onChange={(e) => {
                  setPrivacyLevel(e.target.value as "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY");
                  setConfirmed(false);
                }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[#07080c] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              >
                <option value="PUBLIC_TO_EVERYONE">Público (Todos)</option>
                <option value="MUTUAL_FOLLOW_FRIENDS">Amigos / Seguidores mútuos</option>
                <option value="SELF_ONLY">Privado (Apenas eu)</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-1 sm:pt-4">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={!disableComment}
                  onChange={(e) => {
                    setDisableComment(!e.target.checked);
                    setConfirmed(false);
                  }}
                  className="rounded border-white/20 accent-cyan-400"
                />
                Permitir Comentários
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={!disableDuet}
                  onChange={(e) => {
                    setDisableDuet(!e.target.checked);
                    setConfirmed(false);
                  }}
                  className="rounded border-white/20 accent-cyan-400"
                />
                Permitir Duetos
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={!disableStitch}
                  onChange={(e) => {
                    setDisableStitch(!e.target.checked);
                    setConfirmed(false);
                  }}
                  className="rounded border-white/20 accent-cyan-400"
                />
                Permitir Costura (Stitch)
              </label>
            </div>
          </div>

          <label className="flex min-h-11 items-start gap-3 text-gray-200">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={status === "sending" || !isConfigured}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-cyan-400"
            />
            <span className="text-xs">
              {isReposting
                ? "Confirmo que o vídeo anterior foi apagado no TikTok e desejo reenviá-lo agora para a conta conectada."
                : "Revisei o vídeo e a legenda. Confirmo a publicação na conta conectada do TikTok."}
            </span>
          </label>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={!ready || status === "sending" || !confirmed || !caption.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 py-2.5 text-xs font-black uppercase text-black shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "sending"
                ? "Enviando para o TikTok..."
                : isReposting
                ? "Confirmar e Repostar no TikTok"
                : "Publicar no TikTok (API)"}
            </button>

            <a
              href="https://www.tiktok.com/creator-center/upload"
              target="_blank"
              rel="noopener noreferrer"
              onClick={copyCaption}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/10 hover:text-white"
            >
              Abrir TikTok Studio Web ↗
            </a>
          </div>

          <p className="text-[11px] text-gray-400">
            Dica: Ao clicar em &ldquo;Abrir TikTok Studio Web&rdquo;, o texto e as hashtags são copiados automaticamente para a sua área de transferência.
          </p>
        </form>
      )}
    </div>
  );
}
