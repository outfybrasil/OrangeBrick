"""Unit tests for the long-form pipeline (EDL, chapters, captions, segments, page windows, concatenation).

Usage: pytest -q test_longform.py   (the concatenation/audio tests need ffmpeg on PATH; they are skipped otherwise)
"""

import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent))
import formats as fm  # noqa: E402
import longform as lf  # noqa: E402

HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def _speech(words, total, t0=0.0, loud=-20.0, quiet=-60.0):
    """10 ms energy: loud inside every word, quiet elsewhere."""
    db = np.full(int(round(total / lf.HOP)), quiet, np.float32)
    for w in words:
        a, b = int(round((w["start"] - t0) / lf.HOP)), int(round((w["end"] - t0) / lf.HOP))
        db[a:b] = loud
    return db


def _w(text, start, end):
    return {"word": text, "start": start, "end": end, "p": 0.9}


def _seq(tokens, start=1.0, dur=0.3, gap=0.08, pauses=None):
    out, t = [], start
    for i, tok in enumerate(tokens):
        out.append(_w(tok, round(t, 3), round(t + dur, 3)))
        t += dur + gap + (pauses or {}).get(i, 0.0)
    return out


def _no_cut_inside_words(cuts, words):
    for c in cuts:
        for w in words:
            for edge in (c["start"], c["end"]):
                assert not (w["start"] + 0.02 < edge < w["end"] - 0.02), (c, w)


def test_plan_chunks_cover_range_and_prefer_silence():
    quiet = [(118.0, 119.0), (241.5, 242.5)]
    ch = lf.plan_chunks(0.0, 400.0, 120.0, quiet)
    assert ch[0][0] == 0.0 and ch[-1][1] == 400.0
    assert all(a < b for a, b in ch) and all(ch[i][1] == ch[i + 1][0] for i in range(len(ch) - 1))
    assert ch[0][1] == 118.5 and ch[1][1] == 242.0


def test_long_pause_is_shortened_without_touching_words():
    words = _seq(["isso", "é", "importante."], pauses={1: 2.0}) + [_w("então", 5.0, 5.3)]
    db = _speech(words, 7.0)
    prop = lf.propose_edl(words, db, 0.0, (0.0, 7.0))
    pauses = [c for c in prop["cuts"] if "pause" in c["kind"]]
    assert pauses and all(c["apply"] for c in pauses)
    _no_cut_inside_words(prop["cuts"], words)
    keeps = lf.keep_ranges((0.0, 7.0), prop["cuts"], 24)
    left = (words[2]["start"] - words[1]["end"]) - sum(c["removed_s"] for c in pauses if c["start"] < words[2]["start"] and c["end"] > words[1]["end"])
    assert 0.2 <= left <= 0.5
    assert all(round(a * 24, 6) == round(a * 24) and round(b * 24, 6) == round(b * 24) for a, b in keeps)


def test_repetition_removes_first_copy():
    words = _seq(["a", "gente", "a", "gente", "vai", "ver", "isso"], gap=0.12)
    db = _speech(words, 5.0)
    prop = lf.propose_edl(words, db, 0.0, (0.0, 5.0))
    rep = [c for c in prop["cuts"] if "repeat" in c["kind"]]
    assert len(rep) == 1 and rep[0]["text"] == "a gente" and rep[0]["apply"]
    assert rep[0]["start"] < words[0]["start"] + 0.01 and words[1]["end"] <= rep[0]["end"] <= words[2]["start"]
    _no_cut_inside_words(prop["cuts"], words)
    kept = lf.remap_words(words, lf.edl_chunks(lf.keep_ranges((0.0, 5.0), prop["cuts"], 24)),
                          drop=lf.word_drop_ranges(prop["cuts"]))
    assert [w["word"] for w in kept] == ["a", "gente", "vai", "ver", "isso"]


def test_emphatic_repetition_is_kept():
    words = _seq(["isso", "é", "muito", "muito", "bom"], gap=0.06)
    prop = lf.propose_edl(words, _speech(words, 4.0), 0.0, (0.0, 4.0))
    assert not [c for c in prop["cuts"] if "repeat" in c["kind"]]


def test_false_start_and_filler():
    words = _seq(["a", "gente", "precisa"], gap=0.1, pauses={2: 0.35})
    words += _seq(["a", "gente", "vai", "entender", "hum", "isso"], start=words[-1]["end"] + 0.45, gap=0.1, pauses={3: 0.2, 4: 0.2})
    db = _speech(words, 8.0)
    prop = lf.propose_edl(words, db, 0.0, (0.0, 8.0))
    kinds = {k for c in prop["cuts"] for k in c["kind"].split("+")}
    assert "false_start" in kinds and "filler" in kinds
    _no_cut_inside_words(prop["cuts"], words)
    kept = lf.remap_words(words, lf.edl_chunks(lf.keep_ranges((0.0, 8.0), prop["cuts"], 24)),
                          drop=lf.word_drop_ranges(prop["cuts"]))
    assert [w["word"] for w in kept] == ["a", "gente", "vai", "entender", "isso"]


def test_range_edges_and_exclusions_keep_only_lead_and_tail():
    words = _seq(["primeiro", "bloco."], start=1.5) + _seq(["nome", "privado"], start=4.0) + _seq(["fim", "aqui."], start=7.0)
    db = _speech(words, 10.0)
    prop = lf.propose_edl(words, db, 0.0, (0.0, 10.0), {"exclude": [[3.6, 5.2]]})
    keeps = lf.keep_ranges((0.0, 10.0), prop["cuts"], 24, exclude=[[3.6, 5.2]])
    kept = lf.remap_words(words, lf.edl_chunks(keeps), drop=lf.word_drop_ranges(prop["cuts"], [[3.6, 5.2]]))
    assert [w["word"] for w in kept] == ["primeiro", "bloco.", "fim", "aqui."]
    assert keeps[0][0] == pytest.approx(1.5 - 0.12, abs=0.03)          # leading silence trimmed to the lead
    assert keeps[-1][1] == pytest.approx(words[-1]["end"] + 0.18, abs=0.03)
    junction = (keeps[1][0] - keeps[0][1], kept[2]["start"] - kept[1]["end"])
    assert junction[1] <= 0.12 + 0.18 + 0.05


def test_asr_timing_spilling_into_a_cut_pause_keeps_the_word():
    words = [_w("O", 0.9, 1.6), _w("que", 1.62, 1.8), _w("fim.", 1.85, 2.2), _w("Então", 4.5, 4.9)]
    db = _speech([_w("O", 1.4, 1.6)] + words[1:], 6.0)  # the ASR stretched "O" back into the silence
    prop = lf.propose_edl(words, db, 0.0, (0.0, 6.0))
    chunks = lf.edl_chunks(lf.keep_ranges((0.0, 6.0), prop["cuts"], 24))
    kept = lf.remap_words(words, chunks, drop=lf.word_drop_ranges(prop["cuts"]))
    assert [w["word"] for w in kept] == ["O", "que", "fim.", "Então"]
    assert kept[0]["start"] == pytest.approx(0.0) and all(a["start"] <= b["start"] for a, b in zip(kept, kept[1:]))


def test_tight_gap_cut_needs_review():
    words = [_w("o", 1.0, 1.2), _w("o", 1.21, 1.4), _w("código", 1.5, 1.9)]
    prop = lf.propose_edl(words, _speech(words, 3.0), 0.0, (0.0, 3.0))
    rep = [c for c in prop["cuts"] if "repeat" in c["kind"]]
    assert rep and not rep[0]["apply"] and rep[0]["confidence"] < 0.5


def test_edl_chunks_mapping_roundtrip():
    keeps = [(10.0, 12.5), (13.0, 20.0), (25.0, 26.0)]
    ch = lf.edl_chunks(keeps)
    assert ch[-1]["out_end"] == pytest.approx(10.5)
    for t in (0.0, 2.4, 2.6, 9.9, 10.2):
        s = lf.out_to_source(t, ch)
        assert lf.source_to_out(s, ch) == pytest.approx(t)
    assert lf.keep_ranges((0.0, 10.0), [{"start": 2.0, "end": 3.0, "apply": True}], 24, exclude=[(5.0, 6.0)]) == \
        [(0.0, 2.0), (3.0, 5.0), (6.0, 10.0)]


def test_chapters_rules_and_timestamps():
    ch = [{"start": 0.0, "title": "Intro"}, {"start": 65.0, "title": "Parte 2"}, {"start": 130.5, "title": "Fim"}]
    assert lf.validate_chapters(ch, 200.0) == []
    assert lf.youtube_timestamps(ch, offset=3.0) == "00:00 Intro\n01:08 Parte 2\n02:13 Fim\n"
    bad = lf.validate_chapters([{"start": 2.0, "title": ""}, {"start": 5.0, "title": "x"}], 12.0)
    assert any("0:00" in p for p in bad) and any("at least 3" in p for p in bad) and any("no title" in p for p in bad)
    assert lf.fmt_ts(3725) == "1:02:05"


def test_suggest_chapters_on_sentence_starts():
    words = []
    t = 0.0
    for k in range(60):
        tok = "fim." if k % 10 == 9 else f"palavra{k}"
        words.append(_w(tok, t, t + 0.3))
        t += 0.4 + (3.0 if k % 10 == 9 else 0.0)
    sug = lf.suggest_chapters(words, t, "youtube", target=40)
    assert sug[0]["start"] == 0.0 and len(sug) >= 3
    starts = {round(w["start"], 2) for w in words}
    assert all(round(c["start"], 2) in starts for c in sug)


def test_cue_groups_cover_every_word_once():
    words = _seq(("isso aqui é uma frase longa que precisa quebrar em duas linhas. e depois vem outra frase curta "
                  "e mais uma ideia").split(), gap=0.05)
    cues = lf.cue_groups(words, max_chars=24, max_lines=2)
    flat = [w for c in cues for w in c["words"]]
    assert flat == words
    for a, b in zip(cues, cues[1:]):
        assert a["start"] < a["end"] <= b["start"]
    assert all(len(line) <= 24 for c in cues for line in c["lines"])
    srt = lf.to_srt(cues, offset=3.0)
    assert srt.startswith("1\n00:00:03,") and " --> " in srt
    assert lf.to_vtt(cues).startswith("WEBVTT")


def test_plan_segments_frames_add_up_and_respect_limits():
    segs = lf.plan_segments(200.0, fps=30, max_len=60, cut_points=[50.0, 140.0], avoid=[(99.0, 102.0)])
    assert sum(s["frames"] for s in segs) == 6000
    assert all(s["frames"] <= 60 * 30 for s in segs)
    starts = [s["start"] for s in segs]
    assert 50.0 in starts and 140.0 in starts
    assert not any(99.0 < s < 102.0 for s in starts)
    assert all(abs(s["start"] * 30 - round(s["start"] * 30)) < 1e-6 for s in segs)
    assert len(lf.plan_segments(10.0, max_len=60)) == 1


def test_retention_plan_cadence():
    words = [_w(f"conceito{k}", 5.0 * k, 5.0 * k + 0.4) for k in range(120)]
    plan = lf.retention_plan(words, 0.0, 600.0, "youtube")
    gaps = np.diff([p["t"] for p in plan])
    lo, hi = lf.CADENCE["youtube"]["device"]
    assert len(plan) >= 8 and gaps.min() >= lo - 1e-6 and gaps.max() <= hi + 5


def test_seam_flags():
    luma = [100, 101, 100, 3, 100, 100]
    assert "black_frame" in lf.seam_flags(luma, [0, 1, 1, 90, 90, 1], 3)
    assert "duplicate_frame" in lf.seam_flags([100] * 6, [0, 2.0, 2.0, 0.0, 2.0, 2.0], 3)
    assert lf.seam_flags([100] * 6, [0, 0.0, 0.0, 0.0, 0.0, 0.0], 3) == []  # static slide: not a duplicate
    assert "dark_after_seam" in lf.seam_flags([37, 37, 37, 37, 1, 0], [0, 0, 0.2, 0.3, 36, 1], 3)


def test_segment_page_window():
    import longkit as lk
    import stylepacks as sp
    T = lk.Timeline()
    T.el(1.0, 2.0, '<div id="cap-a" class="lcap">a</div>', cap=True)
    T.js(1.0, "S('#cap-a',{visibility:'visible'},1.0);", t1=2.0, cap=True)
    T.el(70.0, 71.0, '<div id="cap-b" class="lcap">b</div>', cap=True)
    T.js(70.0, "S('#cap-b',{visibility:'visible'},70.0);", t1=71.0, cap=True)
    T.js(0.0, "S('#scr',{opacity:1},0);")
    c = {"fmt": fm.get("16:9"), "pack": sp.get("ide"), "brand": {"name": "B", "lang": "en"}, "duration": 90.0, "off": 0.0,
         "voice_dur": 80.0, "has_screen": False, "has_camera": False, "scr_size": None, "cam_size": None, "cam_file": "",
         "keys": {}}
    whole = lk.write_page(T, c, 0.0, 90.0)
    assert 'id="cap-a"' in whole and 'id="cap-b"' in whole and "window.__timelines.main=tl" in whole
    seg = lk.write_page(T, c, 60.0, 90.0, media={"start": 0.0, "duration": 20.0})
    assert 'id="cap-b"' in seg and 'id="cap-a"' not in seg and "#cap-a" not in seg and "tweenFromTo(60.0000,90.0000" in seg
    assert 'data-duration="30.0000" data-width="1920" data-height="1080"' in seg


def test_layout_inner_cover_and_zoom():
    import longkit as lk
    box = fm.Rect(0, 0, 1920, 1080)
    full = lk.inner(box, (1440, 810))
    assert full["scale"] == pytest.approx(1920 / 1440, rel=1e-4) and full["x"] == 0 and full["y"] == 0
    z = lk.inner(box, (1440, 810), zoom=(0.25, 0.25, 0.5, 0.5))
    assert z["scale"] == pytest.approx(2 * 1920 / 1440, rel=1e-3)
    sq = lk.inner(fm.Rect(0, 0, 500, 500), (1280, 720), focus=(0.5, 0.4))
    assert sq["scale"] == pytest.approx(500 / 720, rel=1e-4) and sq["x"] < 0 and sq["y"] == 0


# ---------------------------------------------------------------- ffmpeg-backed tests

def _testsrc(path, seconds, fps=30, size="320x180", rate=None):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"testsrc2=size={size}:rate={fps}:duration={seconds}",
                    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "20", "-pix_fmt", "yuv420p", str(path)], check=True)


def _count(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                          "stream=nb_read_packets", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout
    return int(out.strip())


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg not installed")
def test_concat_segments_and_single_master(tmp_path):
    import long_cli as lc
    parts = []
    for i, secs in enumerate((1, 2, 1.5)):
        p = tmp_path / f"seg-{i:03d}.mp4"
        _testsrc(p, secs)
        parts.append(p)
    video = lc.concat_segments(parts, tmp_path / "video.mp4")
    assert _count(video) == 30 + 60 + 45
    sr = 48000
    tone = (0.2 * np.sin(2 * np.pi * 440 * np.arange(int(4.5 * sr)) / sr)).astype(np.float32)
    master = tmp_path / "master.wav"
    with wave.open(str(master), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.repeat(tone[:, None], 2, axis=1) * 32767).astype("<i2").tobytes())
    final = lc.mux_master(video, master, tmp_path / "final.mp4", 4.5, "test")
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json",
                                      str(final)], capture_output=True, text=True).stdout)
    kinds = [s["codec_type"] for s in info["streams"]]
    assert kinds.count("audio") == 1 and kinds.count("video") == 1
    assert abs(float(next(s for s in info["streams"] if s["codec_type"] == "video")["duration"]) - 4.5) < 0.05


@pytest.mark.skipif(not HAS_FFMPEG, reason="ffmpeg not installed")
def test_assemble_audio_and_video_keep_the_same_length(tmp_path):
    import long_cli as lc
    src = tmp_path / "src.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=24:duration=6",
                    "-f", "lavfi", "-i", "sine=frequency=330:duration=6", "-c:v", "libx264", "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(src)], check=True)
    keeps = [(0.5, 1.5), (2.0, 2.5), (3.25, 5.0)]
    frames = sum(round((b - a) * 24) for a, b in keeps)
    lc.assemble_video(src, 0.5, keeps, 24, [("crop=160:90:0:0", tmp_path / "screen.mp4", None, False),
                                             (None, tmp_path / "camera.mp4", 320, True)])
    dur = lc.assemble_audio(src, 0.5, keeps, tmp_path / "voice.wav")
    assert _count(tmp_path / "screen.mp4") == frames and _count(tmp_path / "camera.mp4") == frames
    with wave.open(str(tmp_path / "voice.wav")) as w:
        assert w.getnframes() == round(sum(b - a for a, b in keeps) * 48000)
    assert dur == pytest.approx(frames / 24)


def test_silent_style_pack_adds_no_sound_events():
    """`nativo` (family native) sets every SFX category to None; the timeline must skip them."""
    import longkit as lk
    import stylepacks as sp

    pack = sp.get("nativo")
    assert all(value is None for value in pack["sfx"].values())
    assert pack["music"]["bed"] is False and pack["transition"]["kind"] == "cut"
    timeline = lk.Timeline()
    for category in pack["sfx"].values():
        timeline.sfx(1.0, category, -12, "silent")
    timeline.sfx(2.0, "whoosh", -12, "kept")
    assert [s["category"] for s in timeline.sounds] == ["whoosh"]
