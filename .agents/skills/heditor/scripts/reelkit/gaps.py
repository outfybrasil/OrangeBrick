"""Dead-air check of an assembled cut: lists every silence left in voice-raw.wav.

Usage: python gaps.py <work_dir> [max_gap_s=0.45] [min_report_s=0.2]
Silence = 10 ms windows below the cut's threshold (edl.json silence_threshold_dbfs, default -45 dBFS).
Each gap is printed with the words around it and whether it sits on a block junction. Exit code 1 when any gap
inside the speech is longer than max_gap_s: a gap that long reads as an uncut pause, so fix the BLOCKS
(boundaries) or prepare_cut lead/tail/min_pause/edge and prepare again. The last 0.3 s of the voice are ignored.
Intentional pauses (style trailer: black title cards) are declared in edl.json "pauses" ([{out_start, out_end}]);
only the silence around them counts ("excess"), so an uncut pause next to a dramatic beat still fails.
"""

import json
import sys
import wave
from pathlib import Path

import numpy as np


def find_gaps(work, min_report=0.2):
    work = Path(work)
    edl = json.loads((work / "edl.json").read_text())
    thr = float(edl.get("silence_threshold_dbfs", -45.0))
    with wave.open(str(work / "composition/assets/voice-raw.wav")) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32768
    hop = sr // 100
    db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1)) + 1e-9)
    path = work / "words-reviewed.json"
    path = path if path.exists() else work / "words.json"
    words = json.loads(path.read_text()) if path.exists() else []
    words = words if isinstance(words, list) else words.get("words", [])
    cuts = [c["out_start"] for c in edl["chunks"] if c["out_start"] > 0.05]
    pauses = [(p["out_start"], p["out_end"]) for p in edl.get("pauses", [])]
    end = len(x) / sr
    gaps, quiet, i = [], db < thr, 0
    while i < len(quiet):
        if not quiet[i]:
            i += 1
            continue
        j = i
        while j < len(quiet) and quiet[j]:
            j += 1
        s, e = i / 100, j / 100
        if e - s >= min_report and e < end - 0.3:
            before = [w["word"] for w in words if w["start"] < s + 0.05][-1:] or ["^"]
            after = [w["word"] for w in words if w["start"] >= e - 0.25][:1] or ["$"]
            held = sum(max(0.0, min(e, p1) - max(s, p0)) for p0, p1 in pauses)
            gaps.append({"start": s, "end": e, "dur": round(e - s, 2), "before": before[0], "after": after[0],
                         "junction": any(s - 0.05 <= c <= e + 0.05 for c in cuts),
                         "intentional": held > 0, "excess": round(e - s - held, 2)})
        i = j
    return gaps


def main():
    work = sys.argv[1]
    max_gap = float(sys.argv[2]) if len(sys.argv) > 2 else 0.45
    min_report = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
    gaps = find_gaps(work, min_report)
    bad = [g for g in gaps if g["excess"] > max_gap]
    for g in gaps:
        flag = "LONG" if g in bad else ("PAUSE" if g["intentional"] else "ok  ")
        where = "junction" if g["junction"] else "internal"
        extra = f" (declared pause, {g['excess']:.2f}s around it)" if g["intentional"] else ""
        print(f"{flag:5s} {g['start']:7.2f}-{g['end']:7.2f} {g['dur']:.2f}s {where:8s} '{g['before']}' | '{g['after']}'{extra}")
    print(json.dumps({"gaps_reported": len(gaps), "long_gaps": len(bad), "max_gap_s": max_gap,
                      "intentional_pauses": sum(g["intentional"] for g in gaps),
                      "longest_s": max((g["dur"] for g in gaps), default=0)}))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
