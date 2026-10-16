"""Word-timed ASR (faster-whisper) of a window of the source recording.

Usage: asr_window.py <source.mp4> <start_s> <duration_s> <out.json> [prompt] [model]
Env: HEDITOR_LANG (default "pt"), HEDITOR_ASR_THREADS (default 4).
Prints the transcript with the absolute time (s) of each word. Use 0 and the full length for a whole video.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from reelkit import load_audio_16k  # noqa: E402

src, start, dur, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), Path(sys.argv[4])
prompt = sys.argv[5] if len(sys.argv) > 5 else None
model = sys.argv[6] if len(sys.argv) > 6 else "medium"
audio = load_audio_16k(src, start, dur)
m = WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=int(os.environ.get("HEDITOR_ASR_THREADS", 4)))
segs, _ = m.transcribe(audio, language=os.environ.get("HEDITOR_LANG", "pt"), beam_size=5, word_timestamps=True,
                       vad_filter=False, condition_on_previous_text=False, initial_prompt=prompt)
words = [{"word": w.word.strip(), "start": round(start + w.start, 3), "end": round(start + w.end, 3),
          "p": round(w.probability, 3)} for s in segs for w in s.words]
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(words, ensure_ascii=False, indent=1))
print(" ".join(f"[{w['start']:.2f}]{w['word']}" for w in words))
