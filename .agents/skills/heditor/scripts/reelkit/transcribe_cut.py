"""Word-timed ASR of the assembled cut (composition/assets/voice-raw.wav).

Usage: transcribe_cut.py <work_dir> [prompt] [model]
Writes <work>/words.json (list of {word,start,end,p}) and, if absent, <work>/words-reviewed.json (copy to edit:
fix spelling/brand names there; never change timings to invent speech). Env HEDITOR_LANG (default "pt").
"""
import json
import os
import sys
from pathlib import Path

from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from reelkit import load_audio_16k  # noqa: E402

work = Path(sys.argv[1])
prompt = sys.argv[2] if len(sys.argv) > 2 else None
model = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("HEDITOR_ASR_MODEL", "small")
m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=int(os.environ.get("HEDITOR_ASR_THREADS", 4)))
segs, _ = m.transcribe(load_audio_16k(work / "composition/assets/voice-raw.wav"), language=os.environ.get("HEDITOR_LANG", "pt"),
                       beam_size=5, word_timestamps=True, vad_filter=False, condition_on_previous_text=False,
                       initial_prompt=prompt)
words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)}
         for s in segs for w in s.words if w.word.strip()]
(work / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1))
if not (work / "words-reviewed.json").exists():
    (work / "words-reviewed.json").write_text(json.dumps(words, ensure_ascii=False, indent=1))
low = [w for w in words if w["p"] < 0.5]
print(" ".join(f"[{w['start']:.2f}]{w['word']}" for w in words))
print(f"\n{len(words)} words; {len(low)} with low confidence: " + ", ".join(f"{w['word']}@{w['start']}" for w in low[:30]))
