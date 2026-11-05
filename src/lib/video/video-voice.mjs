import fs from "node:fs";
import path from "node:path";

export const EDITORIAL_VOICES = ["pt-BR-ThalitaMultilingualNeural", "pt-BR-FranciscaNeural"];

export function chooseEditorialVoice(requested = "auto", lastVoice, voices = EDITORIAL_VOICES) {
  if (requested && requested !== "auto") return requested;
  const available = [...new Set(voices)].filter(Boolean);
  if (!available.length) throw new Error("Nenhuma voz editorial configurada.");
  return available.find((voice) => voice !== lastVoice) || available[0];
}

export function selectVideoVoice(root, requested = "auto") {
  let previous;
  try {
    previous = JSON.parse(fs.readFileSync(path.join(root, "tmp", "video-voice-history.json"), "utf8")).voice;
  } catch {}
  if (!previous) {
    try {
      previous = Object.values(JSON.parse(fs.readFileSync(path.join(root, "public", "long-videos", "manifest.json"), "utf8")))
        .filter((item) => EDITORIAL_VOICES.includes(item.voice_id) && item.status !== "failed")
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.voice_id;
    } catch {}
  }
  return chooseEditorialVoice(requested, previous);
}

export function recordVideoVoice(root, voice, slug) {
  const target = path.join(root, "tmp", "video-voice-history.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ voice, slug, updated_at: new Date().toISOString(), listening_review_required: true }, null, 2));
  fs.renameSync(temporary, target);
}
