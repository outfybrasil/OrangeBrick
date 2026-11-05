import argparse
import asyncio
import base64
import json
import os
import re
import urllib.request
from pathlib import Path
import edge_tts


def build_words(sentences):
    words = []
    for sentence in sentences:
        sentence_words = [word for word in re.split(r"\s+", sentence["text"].strip()) if word]
        if not sentence_words:
            continue
        total_length = sum(max(len(word), 2) for word in sentence_words)
        current_time = sentence["start"]
        for index, word in enumerate(sentence_words):
            word_duration = sentence["duration"] * max(len(word), 2) / total_length
            word_end = sentence["end"] if index == len(sentence_words) - 1 else round(current_time + word_duration, 3)
            words.append({
                "word": word,
                "start": round(current_time, 3),
                "end": round(word_end, 3)
            })
            current_time = word_end
    return words


def save_timing_files(out_dir: Path, sentences, provider: str, words=None, voice=None):
    timing_method = "provider-alignment" if words else "sentence-weighted-estimate"
    words = words or build_words(sentences)
    with open(out_dir / "sentences.json", "w", encoding="utf-8") as file:
        json.dump(sentences, file, ensure_ascii=False, indent=2)
    with open(out_dir / "words.json", "w", encoding="utf-8") as file:
        json.dump(words, file, ensure_ascii=False, indent=2)
    with open(out_dir / "tts-provider.json", "w", encoding="utf-8") as file:
        json.dump({"provider": provider, "voice": voice, "word_timing": timing_method, "review_required": True}, file)
    print(f"SUCCESS: Generated {len(sentences)} sentences, {len(words)} words with {provider}.")
    if sentences:
        print(f"DURATION: {sentences[-1]['end']}s")


def normalize_sentence_timings(sentences):
    normalized = []
    previous_end = 0
    for sentence in sentences:
        start = sentence["start"]
        end = sentence["end"]
        if start < previous_end:
            if previous_end - start > 0.0021:
                raise ValueError("As frases da narração têm sobreposição incompatível com o arredondamento.")
            start = previous_end
        if end <= start:
            raise ValueError("Uma frase da narração não tem duração válida.")
        normalized.append({**sentence, "start": start, "end": end, "duration": round(end - start, 3)})
        previous_end = end
    return normalized


def validate_transcript(expected_text, sentences):
    def tokenize(value):
        return re.findall(r"[^\W_]+(?:['’][^\W_]+)?", value.casefold(), flags=re.UNICODE)

    expected_words = tokenize(expected_text)
    generated_words = tokenize(" ".join(sentence["text"] for sentence in sentences))
    if not sentences or not expected_words or generated_words != expected_words:
        raise ValueError("A voz sintetizada não corresponde ao roteiro completo. A renderização foi interrompida.")


def generate_elevenlabs(text: str, out_dir: Path, api_key: str, voice_id: str):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
    payload = json.dumps({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.48,
            "similarity_boost": 0.78,
            "style": 0.12,
            "use_speaker_boost": True
        }
    }).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "xi-api-key": api_key},
        method="POST"
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        result = json.loads(response.read())

    alignment = result.get("alignment") or result.get("normalized_alignment")
    if not isinstance(alignment, dict):
        raise ValueError("A API não retornou marcas de tempo para as legendas.")
    characters = alignment.get("characters", [])
    starts = alignment.get("character_start_times_seconds", [])
    ends = alignment.get("character_end_times_seconds", [])
    if len(characters) != len(text) or len(starts) != len(text) or len(ends) != len(text):
        raise ValueError("As marcas de tempo não correspondem ao texto enviado.")

    sentences = []
    cursor = 0
    for part in re.split(r"(?<=[.!?])\s+", text.strip()):
        start_index = text.find(part, cursor)
        if start_index < 0:
            continue
        end_index = start_index + len(part)
        spoken_indices = [index for index in range(start_index, end_index) if not text[index].isspace()]
        if spoken_indices:
            sentence_start = starts[spoken_indices[0]]
            sentence_end = ends[spoken_indices[-1]]
            sentences.append({
                "text": part,
                "start": round(sentence_start, 3),
                "end": round(sentence_end, 3),
                "duration": round(sentence_end - sentence_start, 3)
            })
        cursor = end_index

    if not sentences:
        raise ValueError("Não foi possível preparar as legendas sincronizadas.")
    (out_dir / "voice.mp3").write_bytes(base64.b64decode(result["audio_base64"]))
    words = []
    for match in re.finditer(r"\S+", text):
        words.append({"word": match.group(), "start": round(starts[match.start()], 3), "end": round(ends[match.end() - 1], 3)})
    return sentences, words


async def generate_edge_tts(text: str, voice: str, rate: str, out_dir: Path):
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    sentences = []
    with open(out_dir / "voice.mp3", "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "SentenceBoundary":
                start = round(chunk["offset"] / 10_000_000, 3)
                duration = round(chunk["duration"] / 10_000_000, 3)
                sentences.append({
                    "text": chunk["text"],
                    "start": start,
                    "end": round(start + duration, 3),
                    "duration": duration
                })
    return sentences


async def run_tts(text: str, voice: str, rate: str, out_dir: Path, requested_provider="auto"):
    out_dir.mkdir(parents=True, exist_ok=True)
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    provider = requested_provider if requested_provider != "auto" else ("elevenlabs" if api_key and voice_id else "edge-tts")
    words = None
    if provider == "elevenlabs":
        if not api_key or not voice_id:
            raise ValueError("ElevenLabs selecionado sem configuração completa. Nenhuma voz alternativa foi gerada.")
        sentences, words = generate_elevenlabs(text, out_dir, api_key, voice_id)
    else:
        sentences = await generate_edge_tts(text, voice, rate, out_dir)
    sentences = normalize_sentence_timings(sentences)
    validate_transcript(text, sentences)
    save_timing_files(out_dir, sentences, provider, words, voice_id if provider == "elevenlabs" else voice)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default=os.environ.get("VIDEO_TTS_VOICE", "pt-BR-ThalitaMultilingualNeural"))
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--provider", choices=["auto", "elevenlabs", "edge-tts"], default=os.environ.get("VIDEO_TTS_PROVIDER", "auto"))
    args = parser.parse_args()
    asyncio.run(run_tts(args.text, args.voice, args.rate, Path(args.out_dir), args.provider))


if __name__ == "__main__":
    main()
