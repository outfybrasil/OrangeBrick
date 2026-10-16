"""Long-form logic (pure functions, no browser): ASR chunk planning, EDL proposal, chapters, subtitles, segments.

Everything here works on plain lists/dicts so it can be unit-tested (test_longform.py) and reused by the
`heditor long ...` commands (long_cli.py). Times are seconds. "source" times refer to the original recording,
"out" times to the edited timeline (the voice starts at 0; the composition may add an intro offset).
"""

import math
import re
import subprocess

import numpy as np

HOP = 0.01  # energy window (10 ms)
# Hesitation sounds per language ("um" is an English filler but a Portuguese article: never mix the lists).
FILLERS = {
    "pt": {"ãh", "ã", "ah", "éh", "eh", "hum", "hm", "hmm", "ahn", "ééé", "ããã"},
    "en": {"um", "uh", "uhm", "umm", "er", "erm", "ah", "hmm", "hm", "eh"},
    "es": {"eh", "em", "ehm", "mmm", "este"},
}
# Words that legitimately repeat ("muito muito", "não não") are kept unless the repetition is a short function
# word or the two copies are separated by a hesitation.
SHORT_TOKENS = {"o", "a", "os", "as", "e", "é", "de", "do", "da", "que", "um", "uma", "eu", "se", "no", "na", "em",
                "pra", "pro", "com", "the", "a", "an", "and", "to", "of", "i", "it", "is", "in", "on", "so", "tipo"}
DEFAULTS = {
    "max_pause": 0.55,        # a silence longer than this is shortened
    "keep_pause": 0.30,       # silence left in its place (split before/after)
    "sentence_pause": 0.42,   # silence left after a sentence end (. ? !)
    "min_cut": 0.12,          # ignore removals shorter than this
    "repeat_max_n": 4,        # longest repeated n-gram checked
    "false_start_max": 5,     # longest abandoned fragment (words)
    "false_start_pause": 0.22,
    "fillers": True,
    "min_valley_gap": 0.035,  # word gap needed for a clean word-boundary cut
    "lang": "pt",             # filler list
    "lead": 0.12,             # silence kept before the first word after a range edge or an exclusion
    "tail": 0.18,             # silence kept after the last word before a range edge or an exclusion
}
CADENCE = {  # seconds between retention devices (min, max) and minutes between creative set pieces
    "aula": {"device": (75, 120), "set_piece_min": 6, "chapter_min": (4, 10)},
    "live": {"device": (90, 150), "set_piece_min": 10, "chapter_min": (6, 15)},
    "youtube": {"device": (25, 45), "set_piece_min": 2.5, "chapter_min": (1.5, 4)},
}


# ---------------------------------------------------------------- tokens and energy

def norm(word):
    return re.sub(r"[^\wà-úç-]+", "", str(word).lower()).strip("-")


def energy_profile(source, start=0.0, end=None, sr=16000, block_s=60.0):
    """dB RMS per 10 ms window of [start, end) of any media, streamed through ffmpeg (bounded memory)."""
    args = ["ffmpeg", "-v", "error", "-ss", f"{start:.3f}"]
    if end is not None:
        args += ["-t", f"{end - start:.3f}"]
    args += ["-i", str(source), "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "pipe:1"]
    hop = int(sr * HOP)
    out, rest = [], np.zeros(0, np.float32)
    with subprocess.Popen(args, stdout=subprocess.PIPE) as proc:
        while True:
            buf = proc.stdout.read(int(sr * block_s) * 4)
            if not buf:
                break
            x = np.concatenate([rest, np.frombuffer(buf, np.float32)])
            n = len(x) // hop * hop
            if n:
                out.append(20 * np.log10(np.sqrt(np.mean(x[:n].reshape(-1, hop) ** 2, axis=1)) + 1e-9))
            rest = x[n:]
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def silence_threshold(db):
    """Noise floor (10th percentile) + 12 dB, clamped to [-48, -32] dBFS (same rule as prepare_cut)."""
    floor = float(np.percentile(db, 10)) if len(db) else -60.0
    return min(-32.0, max(-48.0, floor + 12)), floor


def quiet_runs(db, thr, t0=0.0, min_len=0.0, max_blip=0.03):
    """(start, end) of runs below `thr` (times = t0 + index * HOP).

    Voiced blips up to `max_blip` s inside a silence (clicks, a breath peak) do not split it.
    """
    quiet = np.asarray(db) < thr
    if not len(quiet):
        return []
    blip = int(round(max_blip / HOP))
    if blip:
        edges = np.diff(np.concatenate([[1], quiet.astype(np.int8), [1]]))
        for a, b in zip(np.where(edges == -1)[0], np.where(edges == 1)[0]):
            if 0 < a and b < len(quiet) and b - a <= blip:
                quiet[a:b] = True
    edges = np.diff(np.concatenate([[0], quiet.astype(np.int8), [0]]))
    starts, ends = np.where(edges == 1)[0], np.where(edges == -1)[0]
    return [(t0 + a * HOP, t0 + b * HOP) for a, b in zip(starts, ends) if (b - a) * HOP >= min_len]


def valley(db, t0, a, b):
    """Time of the quietest 10 ms window inside [a, b] (falls back to the midpoint)."""
    i0, i1 = max(0, int(round((a - t0) / HOP))), min(len(db), int(round((b - t0) / HOP)) + 1)
    if i1 <= i0:
        return (a + b) / 2, None
    i = i0 + int(np.argmin(db[i0:i1]))
    return t0 + (i + 0.5) * HOP, float(db[i])


# ---------------------------------------------------------------- ASR chunks

def plan_chunks(start, end, chunk=300.0, quiet=None, search=4.0):
    """Split [start, end) into ASR chunks of ~`chunk` s whose boundaries sit in silences when possible.

    quiet: list of (a, b) silent runs; each nominal boundary moves to the centre of the longest run within
    ±search s. Returns [(a, b), ...] covering the range without gaps or overlaps.
    """
    if end <= start:
        return []
    bounds = [start]
    t = start + chunk
    while t < end - min(30.0, chunk / 3):
        best = None
        for a, b in quiet or ():
            c = (a + b) / 2
            if abs(c - t) <= search and (best is None or (b - a) > best[1] - best[0]):
                best = (a, b)
        nxt = round((best[0] + best[1]) / 2, 3) if best else round(t, 3)
        if nxt > bounds[-1] + 1.0:
            bounds.append(nxt)
        t = bounds[-1] + chunk
    bounds.append(end)
    return list(zip(bounds[:-1], bounds[1:]))


def merge_chunk_words(chunks):
    """Merge per-chunk word lists (absolute times), dropping duplicates where chunks touch."""
    words = sorted((w for ws in chunks for w in ws), key=lambda w: (w["start"], w["end"]))
    out = []
    for w in words:
        if out and abs(w["start"] - out[-1]["start"]) < 0.02 and norm(w["word"]) == norm(out[-1]["word"]):
            continue
        out.append(w)
    return out


# ---------------------------------------------------------------- EDL proposal

def _cut(kind, a, b, text="", context="", confidence=1.0, apply=True, **extra):
    d = {"kind": kind, "start": round(a, 3), "end": round(b, 3), "removed_s": round(b - a, 3), "text": text,
         "context": context, "confidence": round(confidence, 2), "apply": bool(apply)}
    d.update(extra)
    return d


def _ctx(words, i, j, k=4):
    left = " ".join(w["word"] for w in words[max(0, i - k):i])
    mid = " ".join(w["word"] for w in words[i:j])
    right = " ".join(w["word"] for w in words[j:j + k])
    return f"{left} [{mid}] {right}".strip()


def _gap_cut(words, db, t0, i, cfg):
    """Cut point in the gap before words[i] (between words[i-1] and words[i]); returns (time, clean)."""
    a = words[i - 1]["end"] if i > 0 else words[i]["start"] - 0.3
    b = words[i]["start"]
    if b - a < cfg["min_valley_gap"]:
        a, b = a - 0.03, b + 0.01
        t, _ = valley(db, t0, a, b)
        return t, False
    t, _ = valley(db, t0, a, b)
    return t, True


def propose_edl(words, db, t0, rng, cfg=None):
    """Proposed removals for [rng[0], rng[1]] of the source.

    words: ASR words with absolute source times ({word, start, end[, p]}); db: 10 ms energy (dBFS) starting at t0.
    Returns {"threshold_dbfs", "noise_floor_dbfs", "config", "cuts": [...]} where every cut has kind
    (pause | repeat | false_start | filler), start/end (source s), text, context, confidence and apply.
    Cuts never split a word: pauses come from energy (quiet windows only) and every word-level cut starts and
    ends at the quietest point of a word gap. Low-confidence word cuts (gap shorter than min_valley_gap) are
    proposed with apply=false for review.
    """
    cfg = dict(DEFAULTS, **(cfg or {}))
    a0, a1 = rng
    words = [w for w in sorted(words, key=lambda w: w["start"]) if w["end"] > a0 and w["start"] < a1]
    thr, floor = silence_threshold(db)
    cuts = []
    # 1. pauses (energy)
    ends_sentence = {round(w["end"], 3) for w in words if str(w["word"]).rstrip().endswith((".", "?", "!"))}
    for s, e in quiet_runs(db, thr, t0, cfg["max_pause"]):
        if s < a0 + 0.05 or e > a1 - 0.05:
            continue
        after_sentence = any(s - 0.4 <= t <= s + 0.1 for t in ends_sentence)
        keep = cfg["sentence_pause"] if after_sentence else cfg["keep_pause"]
        if e - s <= keep + cfg["min_cut"]:
            continue
        lead = min(keep / 2, 0.2)
        cs, ce = s + lead, e - (keep - lead)
        # ASR timings often stretch a word over the following silence. A word is a problem only when none of its
        # voiced 10 ms windows survive outside the cut (a soft word the threshold missed, or a hallucination).
        inside = []
        for w in words:
            if w["start"] < ce - 0.04 and w["end"] > cs + 0.04:
                i0, i1 = int((w["start"] - t0) / HOP), int((w["end"] - t0) / HOP) + 1
                voiced = [i for i in range(max(0, i0), min(len(db), i1)) if db[i] >= thr]
                outside = [i for i in voiced if not (cs <= t0 + i * HOP <= ce)]
                if len(outside) < 3:
                    inside.append(w)
        note = "a word has no voiced audio outside this cut: listen before applying" if inside else ""
        cuts.append(_cut("pause", cs, ce, text="", context=f"{e - s:.2f}s silence", confidence=0.95 if not inside else 0.6,
                         apply=not inside, note=note))
    toks = [norm(w["word"]) for w in words]
    taken = set()
    # 2. repetitions: n-gram immediately repeated -> remove the first copy
    for n in range(cfg["repeat_max_n"], 0, -1):
        for i in range(len(words) - 2 * n + 1):
            if any(k in taken for k in range(i, i + 2 * n)):
                continue
            first, second = toks[i:i + n], toks[i + n:i + 2 * n]
            if not all(first) or first != second:
                continue
            hesit = words[i + n]["start"] - words[i + n - 1]["end"]
            if n == 1 and first[0] not in SHORT_TOKENS and hesit < 0.25 and len(first[0]) > 3:
                continue  # emphatic repetition ("muito muito") without hesitation
            cs, ok1 = _gap_cut(words, db, t0, i, cfg)
            ce, ok2 = _gap_cut(words, db, t0, i + n, cfg)
            if ce - cs < cfg["min_cut"]:
                continue
            conf = 0.9 if ok1 and ok2 else 0.45
            cuts.append(_cut("repeat", cs, ce, " ".join(w["word"] for w in words[i:i + n]), _ctx(words, i, i + n),
                             conf, apply=ok1 and ok2))
            taken.update(range(i, i + n))
    # 3. false starts: an abandoned fragment followed by a pause and a restart with the same first word(s)
    for i in range(len(words)):
        if i in taken:
            continue
        for length in range(1, cfg["false_start_max"] + 1):
            j = i + length
            if j >= len(words) or any(k in taken for k in range(i, j)):
                break
            pause = words[j]["start"] - words[j - 1]["end"]
            trailing = str(words[j - 1]["word"]).rstrip().endswith(("-", "...", "…"))
            if pause < cfg["false_start_pause"] and not trailing:
                continue
            m = 0
            while m < length and j + m < len(words) and toks[i + m] == toks[j + m]:
                m += 1
            need = 2 if all(t in SHORT_TOKENS for t in toks[i:i + 1]) else 1
            # "aplicativos, mobile, aplicativos para celular": one repeated content word is an elaboration, not
            # an abandoned start; keep it unless the ASR marked the fragment as cut off ("-", "...").
            elaboration = m == 1 and length > 1 and not trailing and toks[i] not in SHORT_TOKENS
            if (m >= need and length - m <= 2 and not elaboration
                    and not (m == length and length <= cfg["repeat_max_n"])):
                cs, ok1 = _gap_cut(words, db, t0, i, cfg)
                ce, ok2 = _gap_cut(words, db, t0, j, cfg)
                if ce - cs >= cfg["min_cut"]:
                    sure = ok1 and ok2 and (m >= 2 or trailing)
                    cuts.append(_cut("false_start", cs, ce, " ".join(w["word"] for w in words[i:j]), _ctx(words, i, j),
                                     0.75 if sure else 0.4, apply=sure))
                    taken.update(range(i, j))
                break
    # 4. isolated fillers
    if cfg["fillers"]:
        for i, t in enumerate(toks):
            if i in taken or t not in FILLERS.get(cfg["lang"], FILLERS["en"]):
                continue
            before = words[i]["start"] - (words[i - 1]["end"] if i else a0)
            after = (words[i + 1]["start"] if i + 1 < len(words) else a1) - words[i]["end"]
            if max(before, after) < 0.12:
                continue
            cs, ok1 = _gap_cut(words, db, t0, i, cfg)
            ce, ok2 = (_gap_cut(words, db, t0, i + 1, cfg) if i + 1 < len(words) else (words[i]["end"] + 0.05, True))
            if ce - cs >= cfg["min_cut"]:
                cuts.append(_cut("filler", cs, ce, words[i]["word"], _ctx(words, i, i + 1), 0.8 if ok1 and ok2 else 0.4,
                                 apply=ok1 and ok2))
                taken.add(i)
    # 5. silence at the range edges and around manual exclusions (cfg["exclude"]): keep lead/tail only
    for xa, xb in [(None, a0)] + [tuple(x) for x in cfg.get("exclude", [])] + [(a1, None)]:
        if xa is not None:  # silence before an exclusion / the range end
            v = _last_voiced(db, t0, thr, max(a0, xa - 3.0), xa)
            if v is not None and xa - (v + cfg["tail"]) >= cfg["min_cut"]:
                cuts.append(_cut("edge", v + cfg["tail"], xa, context="silence before a cut edge", confidence=0.95))
        if xb is not None:  # silence after an exclusion / the range start
            v = _first_voiced(db, t0, thr, xb, min(a1, xb + 3.0))
            if v is not None and (v - cfg["lead"]) - xb >= cfg["min_cut"]:
                cuts.append(_cut("edge", xb, v - cfg["lead"], context="silence after a cut edge", confidence=0.95))
    cuts = [c for c in cuts if not any(x[0] <= c["start"] and c["end"] <= x[1] for x in cfg.get("exclude", []))]
    cuts = merge_cuts(cuts)
    for k, c in enumerate(cuts):
        c["id"] = f"c{k:04d}"
    return {"range": [a0, a1], "threshold_dbfs": round(thr, 1), "noise_floor_dbfs": round(floor, 1), "config": cfg,
            "cuts": cuts, "stats": edl_stats(cuts, a1 - a0)}


def _voiced_index(db, t0, thr, a, b, min_run=4):
    i0, i1 = max(0, int(round((a - t0) / HOP))), min(len(db), int(round((b - t0) / HOP)))
    v = np.asarray(db[i0:i1]) >= thr
    runs, i = [], 0
    while i < len(v):
        if v[i]:
            j = i
            while j < len(v) and v[j]:
                j += 1
            if j - i >= min_run:
                runs.append((i0 + i, i0 + j))
            i = j
        else:
            i += 1
    return runs


def _first_voiced(db, t0, thr, a, b):
    runs = _voiced_index(db, t0, thr, a, b)
    return t0 + runs[0][0] * HOP if runs else None


def _last_voiced(db, t0, thr, a, b):
    runs = _voiced_index(db, t0, thr, a, b)
    return t0 + runs[-1][1] * HOP if runs else None


def merge_cuts(cuts):
    """Sort and merge overlapping cuts (kinds are joined, apply = all applied)."""
    out = []
    for c in sorted(cuts, key=lambda c: (c["start"], c["end"])):
        if out and c["start"] <= out[-1]["end"] + 0.02:
            p = out[-1]
            p["end"] = max(p["end"], c["end"])
            p["removed_s"] = round(p["end"] - p["start"], 3)
            if c["kind"] not in p["kind"].split("+"):
                p["kind"] += "+" + c["kind"]
            p["text"] = " ".join(x for x in (p["text"], c["text"]) if x)
            p["apply"] = p["apply"] and c["apply"]
            p["confidence"] = min(p["confidence"], c["confidence"])
            continue
        out.append(dict(c))
    return out


def edl_stats(cuts, total):
    applied = [c for c in cuts if c["apply"]]
    by = {}
    for c in applied:
        for k in c["kind"].split("+"):
            by[k] = by.get(k, 0) + 1
    removed = sum(c["removed_s"] for c in applied)
    return {"source_s": round(total, 2), "removed_s": round(removed, 2), "kept_s": round(total - removed, 2),
            "cuts_applied": len(applied), "cuts_review": len(cuts) - len(applied), "by_kind": by}


def keep_ranges(rng, cuts, fps, exclude=(), min_keep=0.12):
    """Source ranges to keep: rng minus applied cuts and manual exclusions, snapped to whole frames."""
    remove = sorted([(c["start"], c["end"]) for c in cuts if c.get("apply")] + [tuple(x) for x in exclude])
    keeps, pos = [], rng[0]
    for a, b in remove:
        a, b = max(a, rng[0]), min(b, rng[1])
        if b <= pos:
            continue
        if a > pos:
            keeps.append((pos, a))
        pos = max(pos, b)
    if rng[1] > pos:
        keeps.append((pos, rng[1]))
    out = []
    for a, b in keeps:
        fa, fb = round(a * fps), round(b * fps)
        if (fb - fa) / fps >= min_keep:
            out.append((fa / fps, fb / fps))
    return out


def edl_chunks(keeps):
    chunks, cursor = [], 0.0
    for i, (a, b) in enumerate(keeps):
        chunks.append({"block": f"k{i:04d}", "source_in": round(a, 6), "source_out": round(b, 6),
                       "out_start": round(cursor, 6), "out_end": round(cursor + b - a, 6), "speed": 1.0})
        cursor += b - a
    return chunks


def out_to_source(t, chunks):
    for c in chunks:
        if c["out_start"] - 1e-6 <= t < c["out_end"] + 1e-6:
            return c["source_in"] + (t - c["out_start"])
    return None


def source_to_out(t, chunks):
    for c in chunks:
        if c["source_in"] - 1e-6 <= t <= c["source_out"] + 1e-6:
            return c["out_start"] + (t - c["source_in"])
    return None


def _clamp_out(t, chunks, side):
    """Out time of a source time; inside a removed range -> next keep start (side="start") or previous keep end."""
    for c in chunks:
        if c["source_in"] - 1e-6 <= t <= c["source_out"] + 1e-6:
            return c["out_start"] + (t - c["source_in"])
    if side == "start":
        nxt = [c for c in chunks if c["source_in"] > t]
        return nxt[0]["out_start"] if nxt else chunks[-1]["out_end"]
    prv = [c for c in chunks if c["source_out"] < t]
    return prv[-1]["out_end"] if prv else chunks[0]["out_start"]


def remap_words(words, chunks, drop=None, min_overlap=0.5):
    """Words of the source mapped onto the edited timeline.

    drop: source ranges whose words are removed (word-level cuts and exclusions); a word goes when its midpoint
    falls inside one. Pause and edge cuts only remove silence, so they never remove a word: ASR timings that
    spill into a removed silence are clamped to the nearest kept audio. Without `drop` (legacy), a word is kept
    when at least `min_overlap` of it survives.
    """
    out = []
    if not chunks:
        return out
    lo, hi = chunks[0]["source_in"], chunks[-1]["source_out"]
    for w in words:
        mid = (w["start"] + w["end"]) / 2
        if drop is not None:
            if not (lo - 0.05 <= mid <= hi + 0.05) or any(a <= mid <= b for a, b in drop):
                continue
        else:
            dur = max(1e-3, w["end"] - w["start"])
            kept = sum(max(0.0, min(w["end"], c["source_out"]) - max(w["start"], c["source_in"])) for c in chunks)
            if kept < min_overlap * dur and not (dur < 0.06 and any(c["source_in"] <= w["start"] < c["source_out"] for c in chunks)):
                continue
        s = _clamp_out(w["start"], chunks, "start")
        e = _clamp_out(w["end"], chunks, "end")
        if out and s < out[-1]["start"]:
            s = out[-1]["start"]
        e = max(e, s + 0.02)
        item = dict(w, start=round(s, 3), end=round(e, 3))
        item["source_start"] = round(w["start"], 3)
        out.append(item)
    return out


def word_drop_ranges(cuts, exclude=()):
    """Source ranges whose words disappear: applied word-level cuts (repeat, false start, filler) + exclusions."""
    rng = [(c["start"], c["end"]) for c in cuts if c.get("apply") and any(k in c["kind"] for k in ("repeat", "false_start", "filler"))]
    return rng + [tuple(x) for x in exclude]


# ---------------------------------------------------------------- chapters

def fmt_ts(t):
    t = int(math.floor(t + 1e-6))
    h, m, s = t // 3600, t // 60 % 60, t % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def suggest_chapters(words, duration, kind="aula", target=None):
    """Chapter boundaries at sentence starts after the longest pauses, spaced by the kind's chapter length.

    Returns [{"start", "excerpt"}]; the agent writes the titles (never invented content: titles summarise what
    is said in the excerpt range).
    """
    lo, hi = CADENCE.get(kind, CADENCE["aula"])["chapter_min"]
    target = target or (lo + hi) / 2 * 60
    if duration < 3 * 10:
        return [{"start": 0.0, "excerpt": " ".join(w["word"] for w in words[:12])}]
    n = max(3, round(duration / target)) if duration >= 3 * max(10.0, lo * 60 / 2) else 3
    min_len = max(10.0, duration / n * 0.5)
    cands = []
    for i in range(1, len(words)):
        prev, w = words[i - 1], words[i]
        if str(prev["word"]).rstrip().endswith((".", "?", "!")):
            cands.append((w["start"] - prev["end"], w["start"], i))
    cands.sort(reverse=True)
    chosen = [0.0]
    for _gap, t, _i in cands:
        if len(chosen) >= n:
            break
        if all(abs(t - c) >= min_len for c in chosen) and duration - t >= min_len:
            chosen.append(t)
    if len(chosen) < 3:  # evenly spaced fallback, snapped to the next word start
        chosen = [0.0]
        for k in range(1, 3):
            t = duration * k / 3
            nxt = next((w["start"] for w in words if w["start"] >= t), t)
            chosen.append(nxt)
    chosen.sort()
    out = []
    for k, t in enumerate(chosen):
        end = chosen[k + 1] if k + 1 < len(chosen) else duration
        ws = [w["word"] for w in words if t - 1e-3 <= w["start"] < end]
        out.append({"start": round(t, 2), "excerpt": " ".join(ws[:24]) + (" …" if len(ws) > 24 else "")})
    return out


def validate_chapters(chapters, duration, min_len=10.0):
    """YouTube chapter rules: first at 0:00, at least 3, ascending, each >= 10 s, titles present."""
    problems = []
    if len(chapters) < 3:
        problems.append("YouTube needs at least 3 chapters")
    if not chapters or abs(chapters[0]["start"]) > 1e-6:
        problems.append("the first chapter must start at 0:00")
    for k, c in enumerate(chapters):
        if not str(c.get("title", "")).strip():
            problems.append(f"chapter {k + 1} has no title")
        end = chapters[k + 1]["start"] if k + 1 < len(chapters) else duration
        if end - c["start"] < min_len:
            problems.append(f"chapter {k + 1} lasts {end - c['start']:.1f} s (< {min_len:.0f} s)")
        if k and c["start"] <= chapters[k - 1]["start"]:
            problems.append(f"chapter {k + 1} is not after chapter {k}")
        if c["start"] > duration:
            problems.append(f"chapter {k + 1} starts after the end")
    return problems


def youtube_timestamps(chapters, offset=0.0):
    """Description block: "00:00 Title" per chapter (offset = intro seconds before the voice)."""
    lines = []
    for k, c in enumerate(chapters):
        t = 0.0 if k == 0 else c["start"] + offset
        lines.append(f"{fmt_ts(t)} {c['title']}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- captions and subtitles

def _wrap(text, width, lines):
    """Balanced wrap into at most `lines` lines (None if it does not fit)."""
    words = text.split()
    if len(text) <= width:
        return [text]
    if lines < 2:
        return None
    best = None
    for k in range(1, len(words)):
        a, b = " ".join(words[:k]), " ".join(words[k:])
        if len(a) <= width and len(b) <= width:
            score = abs(len(a) - len(b))
            if best is None or score < best[0]:
                best = (score, [a, b])
    return best[1] if best else None


def cue_groups(words, max_chars=42, max_lines=2, max_dur=6.0, gap_split=0.6, min_dur=0.8):
    """Phrase groups for subtitles and burned captions: break on sentence ends, pauses, length and duration.

    Returns [{"id", "start", "end", "text", "lines", "words"}] in order, never overlapping. Every word appears in
    exactly one group (the burned-caption test compares them with the reviewed words).
    """
    groups, cur = [], []

    def flush():
        if cur:
            groups.append(list(cur))
            cur.clear()

    for w in words:
        shown = w.get("shown", w["word"])
        if cur:
            text = " ".join(x.get("shown", x["word"]) for x in cur + [w])
            gap = w["start"] - cur[-1]["end"]
            if (_wrap(text, max_chars, max_lines) is None or gap > gap_split or w["end"] - cur[0]["start"] > max_dur):
                flush()
        cur.append(w)
        if str(shown).rstrip().endswith((".", "?", "!")):
            flush()
    flush()
    out = []
    for i, ws in enumerate(groups):
        text = " ".join(x.get("shown", x["word"]) for x in ws)
        start = ws[0]["start"] - 0.05
        end = ws[-1]["end"] + 0.25
        nxt = groups[i + 1][0]["start"] - 0.05 if i + 1 < len(groups) else None
        if end - start < min_dur:
            end = start + min_dur
        if nxt is not None:
            end = min(end, nxt - 0.01)
        if out:
            start = max(start, out[-1]["end"] + 0.001)
        end = max(end, start + 0.05)
        out.append({"id": f"cap-{i}", "start": round(max(0.0, start), 3), "end": round(end, 3), "text": text,
                    "lines": _wrap(text, max_chars, max_lines) or [text], "words": ws})
    return out


def _ts(t, sep):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(cues, offset=0.0):
    out = []
    for k, c in enumerate(cues, 1):
        out.append(f"{k}\n{_ts(c['start'] + offset, ',')} --> {_ts(c['end'] + offset, ',')}\n" + "\n".join(c["lines"]) + "\n")
    return "\n".join(out)


def to_vtt(cues, offset=0.0):
    out = ["WEBVTT\n"]
    for c in cues:
        out.append(f"{_ts(c['start'] + offset, '.')} --> {_ts(c['end'] + offset, '.')}\n" + "\n".join(c["lines"]) + "\n")
    return "\n".join(out)


# ---------------------------------------------------------------- segments, retention, render estimate

def plan_segments(duration, fps=30, max_len=60.0, cut_points=(), avoid=(), min_len=4.0):
    """Split the timeline into render segments.

    cut_points: preferred boundaries (chapter starts); pieces longer than max_len are split evenly; every
    boundary is moved out of `avoid` ranges (set pieces, transitions) and snapped to whole frames. Returns
    [{"index", "start", "end", "frames", "start_frame"}] covering [0, duration] exactly (frames add up).
    """
    total = int(round(duration * fps))

    def free(t):
        for _ in range(len(avoid) + 1):  # overlapping ranges: move until outside all of them
            hit = next(((a, b) for a, b in avoid if a < t < b), None)
            if hit is None:
                return t
            t = hit[0] if t - hit[0] <= hit[1] - t else hit[1]
        return t

    pts = sorted({round(p, 3) for p in cut_points if min_len <= p <= duration - min_len})
    bounds = [0.0]
    for p in pts + [duration]:
        a = bounds[-1]
        span = p - a
        if span < min_len:
            continue
        n = max(1, math.ceil(span / max_len - 1e-9))
        bounds += [a + span * k / n for k in range(1, n)] + [p]
    gap = max(1, int(round(min_len * fps)))
    frames = [0]
    for t in bounds[1:]:
        f = min(max(int(round(free(t) * fps)), 0), total)
        if f - frames[-1] >= gap and total - f >= gap:
            frames.append(f)
    frames.append(total)
    segs = []
    for i, (a, b) in enumerate(zip(frames[:-1], frames[1:])):
        segs.append({"index": i, "start": a / fps, "end": b / fps, "frames": b - a, "start_frame": a})
    return segs


def retention_plan(words, start, end, kind="aula", avoid=(), stop=frozenset()):
    """Retention devices at the kind's cadence, each anchored on a content word (keyword callout candidates).

    Returns [{"t", "word"}]; the build decides the device (keyword chip, punch-in, layout switch, progress).
    """
    lo, hi = CADENCE.get(kind, CADENCE["aula"])["device"]
    out, t = [], start + lo
    content = [w for w in words if len(norm(w["word"])) >= 6 and norm(w["word"]) not in stop and start <= w["start"] <= end]
    while t < end - lo / 2:
        window = [w for w in content if t <= w["start"] <= t + (hi - lo)
                  and not any(a - 1 <= w["start"] <= b + 1 for a, b in avoid)]
        if window:
            w = max(window, key=lambda x: (len(norm(x["word"])), -x["start"]))
            out.append({"t": round(w["start"], 3), "word": w["word"].strip(".,;:!?")})
            t = w["start"] + lo
        else:
            t += (hi - lo) / 2
    return out


def estimate_render(seconds, fps=30, history=None, workers=2, default_spf=0.42):
    """Render time estimate from measured seconds-per-frame (history = [{"frames", "seconds"}])."""
    frames = seconds * fps
    if history:
        f = sum(h["frames"] for h in history)
        s = sum(h["seconds"] for h in history)
        spf = s / max(1, f)
    else:
        spf = default_spf * 2 / max(1, workers)
    return {"frames": int(frames), "sec_per_frame": round(spf, 3), "eta_s": round(frames * spf),
            "minutes_per_video_minute": round(spf * fps * 60 / 60, 1)}


def seam_flags(luma, diffs, idx, dark=16.0):
    """Flags for a segment seam given per-frame mean luma and |frame - previous| diffs around it.

    idx: position of the first frame of the new segment in the arrays. Dark flash: the boundary frame is much
    darker than both neighbours. Duplicate: diff == 0 at the boundary while neighbours move.
    """
    flags = []
    if 0 < idx < len(luma) - 1:
        for j in (idx - 1, idx):
            if luma[j] < dark and luma[j - 1] > dark * 2 and luma[min(len(luma) - 1, j + 1)] > dark * 2:
                flags.append("black_frame")
                break
        else:
            if luma[idx - 1] > dark * 2 and min(luma[idx:idx + 2]) < dark / 2:
                flags.append("dark_after_seam")  # inspect qa/seams.jpg: intended cut to black or an empty box
    if 0 < idx < len(diffs):
        around = [d for k, d in enumerate(diffs) if k != idx and abs(k - idx) <= 3]
        if diffs[idx] < 0.05 and around and np.median(around) > 0.5:
            flags.append("duplicate_frame")
    return flags
