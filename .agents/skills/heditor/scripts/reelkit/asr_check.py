"""ASR of the final mix versus the clean voice: checks that music and SFX do not mask the speech.

Usage: asr_check.py <work_dir>   (env HEDITOR_LANG, default "pt")
Target: master similarity >= 0.90 of the expected words and not more than 0.03 below the clean voice.
"""

import difflib
import json
import os
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from reelkit import load_audio_16k  # noqa: E402

WORK = Path(sys.argv[1])


def norm(text):
    return re.findall(r"[a-zà-ú0-9]+", text.lower())


def main():
    plan = json.loads((WORK / "plan.json").read_text())
    ref = norm(" ".join(w["word"] for c in plan["captions"] for w in c["words"]))
    model = WhisperModel(os.environ.get("HEDITOR_ASR_CHECK_MODEL", "small"), device="cpu", compute_type="int8", cpu_threads=2)
    out = {}
    for name in ["voice-master.wav", "master.wav"]:
        segs, _ = model.transcribe(load_audio_16k(WORK / "composition/assets" / name), language=os.environ.get("HEDITOR_LANG", "pt"), beam_size=5, vad_filter=False)
        rows = [{"start": s.start, "end": s.end, "text": s.text} for s in segs if s.start < plan["voice_end"]]
        heard = norm(" ".join(r["text"] for r in rows))
        out[name] = {"similarity": difflib.SequenceMatcher(None, ref, heard).ratio(), "text": " ".join(r["text"] for r in rows)}
    out["delta_master_minus_voice"] = out["master.wav"]["similarity"] - out["voice-master.wav"]["similarity"]
    (WORK / "qa/asr-check.json").write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(json.dumps({k: (v["similarity"] if isinstance(v, dict) else v) for k, v in out.items()}))
    print("MASTER:", out["master.wav"]["text"])


if __name__ == "__main__":
    main()
