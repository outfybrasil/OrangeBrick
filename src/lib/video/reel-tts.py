import argparse
import asyncio
import json
import re
from pathlib import Path
import edge_tts

async def run_tts(text: str, voice: str, rate: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    audio_path = out_dir / "voice.mp3"

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    sentences = []

    with open(audio_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start_sec = round(chunk["offset"] / 10_000_000, 3)
                duration_sec = round(chunk["duration"] / 10_000_000, 3)
                end_sec = round(start_sec + duration_sec, 3)
                sentences.append({
                    "text": chunk["text"],
                    "start": start_sec,
                    "end": end_sec,
                    "duration": duration_sec
                })

    # Divide sentences into words with proportional timestamps
    words = []
    for s in sentences:
        s_words = [w for w in re.split(r"\s+", s["text"].strip()) if w]
        if not s_words:
            continue
        total_len = sum(max(len(w), 2) for w in s_words)
        curr_t = s["start"]
        dur = s["duration"]
        for i, w in enumerate(s_words):
            w_prop = max(len(w), 2) / total_len
            w_dur = round(dur * w_prop, 3)
            w_end = round(curr_t + w_dur, 3)
            if i == len(s_words) - 1:
                w_end = s["end"]
            words.append({
                "word": w,
                "start": round(curr_t, 3),
                "end": round(w_end, 3)
            })
            curr_t = w_end

    with open(out_dir / "sentences.json", "w", encoding="utf-8") as f:
        json.dump(sentences, f, ensure_ascii=False, indent=2)

    with open(out_dir / "words.json", "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"SUCCESS: Generated {len(sentences)} sentences, {len(words)} words.")
    if sentences:
        print(f"DURATION: {sentences[-1]['end']}s")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default="pt-BR-AntonioNeural")
    parser.add_argument("--rate", default="+6%")
    parser.add_argument("--out-dir", required=True)
    args = parser.parse_args()

    asyncio.run(run_tts(args.text, args.voice, args.rate, Path(args.out_dir)))

if __name__ == "__main__":
    main()
