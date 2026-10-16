"""QA report of a finished long-form video: qa/long-report.json + qa/long-report.md + contact sheets.

Gates (thresholds in the report; loudness target from plan["loudness"], default -14 LUFS / -1 dBTP):
  duration     final duration = plan duration (± 1 frame + 50 ms), size = format profile, fps
  decode       full decode without errors
  loudness     integrated LUFS within ±1 LU of the target, true peak <= target
  audio        final audio correlates with master.wav (sampled windows, >= 0.98)
  sync         camera/screen/voice vs the source through the EDL (camera_sync_check.sync_against_source)
  asr          sampled windows of the final audio transcribed and compared with the reviewed words (mean >= 0.85)
  chapters     YouTube rules (first 0:00, >= 3, >= 10 s, titles) and each start on a word start
  seams        every segment boundary: frame count per segment, no black flash, no duplicated frame
  sheets       qa/long-sheet-NN.jpg (<= 1400 px wide) + qa/seams.jpg for vision review
"""

import difflib
import json
import os
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

import formats as fm
import longform as lf


def _run(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def _probe(path):
    return json.loads(_run(["ffprobe", "-v", "error", "-show_entries",
                            "format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels",
                            "-of", "json", str(path)], check=True).stdout)


def ebur128(path):
    err = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    summ = err[err.rfind("Summary:"):]

    def grab(label):
        for line in summ.splitlines():
            if line.strip().startswith(label):
                try:
                    return float(line.split()[1])
                except ValueError:
                    return None
        return None
    return {"lufs_i": grab("I:"), "lra": grab("LRA:"), "true_peak_dbtp": grab("Peak:")}


def aac_true_peak(wav, tmp):
    _run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(tmp)], check=True)
    tp = ebur128(tmp)["true_peak_dbtp"]
    tmp.unlink()
    return tp


def guard_true_peak(work, plan):
    """Re-limit master.wav when its AAC encode overshoots the true-peak target (bright SFX)."""
    import longmix
    work = Path(work)
    loud = plan.get("loudness", {"lufs": -14.0, "true_peak": -1.0})
    limit = loud.get("true_peak", -1.0)
    master = work / "composition/assets/master.wav"
    tmp = work / "render/tp-probe.m4a"
    tp = aac_true_peak(master, tmp)
    if tp is None or tp <= limit:
        return {"aac_true_peak_before": tp}
    orig = work / "composition/assets/master-pre-tp.wav"
    if not orig.exists():
        orig.write_bytes(master.read_bytes())
    after = tp
    for target in (limit - 2.0, limit - 3.0, limit - 4.5):
        longmix.loudnorm(work / "composition/assets/premaster.wav", master, loud.get("lufs", -14.0), target)
        after = aac_true_peak(master, tmp)
        if after <= limit:
            return {"aac_true_peak_before": tp, "tp_target": target, "aac_true_peak_after": after}
    return {"aac_true_peak_before": tp, "aac_true_peak_after": after, "warning": "true peak above limit"}


def _pcm(path, start, dur, sr=16000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(path), "-vn", "-ac", "1",
                          "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def audio_correlation(final, master, duration, n=8, win=5.0):
    vals = []
    for k in range(n):
        t = (duration - win) * (k + 0.5) / n
        a, b = _pcm(final, t, win), _pcm(master, t, win)
        m = min(len(a), len(b))
        if m > 1000 and np.std(a[:m]) > 1e-5 and np.std(b[:m]) > 1e-5:
            vals.append(float(np.corrcoef(a[:m], b[:m])[0, 1]))
    return vals


def frame_at(video, t, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={w}:{h}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    if len(raw) != w * h * 3:
        return Image.new("RGB", (w, h))
    return Image.frombytes("RGB", (w, h), raw)


def contact_sheets(video, duration, fmt, out_dir, per_sheet=24, max_frames=96, max_width=1400):
    n = int(min(max_frames, max(per_sheet, round(duration / 8 / per_sheet) * per_sheet)))  # full sheets only
    times = [round(0.05 + i * (duration - 0.15) / (n - 1), 2) for i in range(n)]
    cols = 6
    cw = min(224 if not fmt.vertical else 150, max_width // cols)
    cw, ch = fmt.thumb(width=cw)
    sheets = []
    for s in range(0, n, per_sheet):
        chunk = times[s:s + per_sheet]
        rows = (len(chunk) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cw, rows * ch))
        for i, t in enumerate(chunk):
            sheet.paste(frame_at(video, t, cw, ch), ((i % cols) * cw, (i // cols) * ch))
        p = out_dir / f"long-sheet-{s // per_sheet + 1:02d}.jpg"
        sheet.save(p, quality=86)
        sheets.append({"file": str(p), "times": chunk})
    return sheets


def seam_check(video, segs, fmt, out_dir, fps=30):
    """Luma/diff of 3 frames on each side of every boundary + a strip per seam (qa/seams.jpg)."""
    w, h = 160, max(2, round(160 / fmt.aspect / 2) * 2)
    rows, strips = [], []
    for s in segs[1:]:
        b = s["start_frame"]
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, (b - 3 - 0.5) / fps):.5f}", "-i", str(video),
                              "-frames:v", "6", "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                             capture_output=True).stdout
        f = np.frombuffer(raw, np.uint8)
        if len(f) < w * h * 6:
            rows.append({"frame": b, "t": round(b / fps, 3), "flags": ["missing_frames"]})
            continue
        f = f[: w * h * 6].reshape(6, h, w).astype(np.float32)
        luma = f.mean(axis=(1, 2)).tolist()
        diffs = [0.0] + np.abs(np.diff(f, axis=0)).mean(axis=(1, 2)).tolist()
        flags = lf.seam_flags(luma, diffs, 3)
        rows.append({"frame": b, "t": round(b / fps, 3), "luma": [round(x, 1) for x in luma],
                     "diffs": [round(x, 2) for x in diffs], "flags": flags})
        strip = Image.new("L", (w * 6, h))
        for i in range(6):
            strip.paste(Image.fromarray(f[i].astype(np.uint8)), (i * w, 0))
        strips.append(strip)
    if strips:
        sheet = Image.new("L", (w * 6, h * len(strips)))
        for i, st in enumerate(strips):
            sheet.paste(st, (0, i * h))
        sheet.thumbnail((1400, 4000))
        sheet.save(out_dir / "seams.jpg", quality=86)
    return rows


def _norm_words(text):
    return re.findall(r"[a-zà-úç0-9]+", text.lower())


def asr_windows(final, words, plan, n=None, win=20.0):
    from faster_whisper import WhisperModel

    import reelkit as rk
    off = plan.get("voice_offset", 0.0)
    vd = plan["voice_end"] - off
    n = n or int(min(12, max(3, vd // 60)))
    model = WhisperModel(os.environ.get("HEDITOR_ASR_CHECK_MODEL", "small"), device="cpu", compute_type="int8",
                         cpu_threads=int(os.environ.get("HEDITOR_ASR_THREADS", 3)))
    rows = []
    for k in range(n):
        a = max(0.0, (vd - win) * (k + 0.5) / n)
        ref = [w["word"] for w in words if a + 0.3 <= w["start"] and w["end"] <= a + win - 0.3]
        audio = rk.load_audio_16k(final, off + a, win)
        segs, _ = model.transcribe(audio, language=os.environ.get("HEDITOR_LANG", "pt"), beam_size=5, vad_filter=False,
                                   condition_on_previous_text=False)
        heard = " ".join(s.text for s in segs)
        sim = difflib.SequenceMatcher(None, _norm_words(" ".join(ref)), _norm_words(heard)).ratio()
        rows.append({"start": round(off + a, 2), "similarity": round(sim, 3), "heard": heard.strip()[:300]})
    return rows


def run(work, final, tp_guard=None, asr=True):
    work, final = Path(work), Path(final)
    qa = work / "qa"
    qa.mkdir(exist_ok=True)
    plan = json.loads((work / "plan.json").read_text())
    fmt = fm.get(plan["format"])
    fps = plan.get("fps", 30)
    probe = _probe(final)
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    au = next((s for s in probe["streams"] if s["codec_type"] == "audio"), {})
    dur = float(probe["format"]["duration"])
    gates = {}
    gates["duration"] = {"value": round(dur, 3), "expected": plan["duration"], "size": [v["width"], v["height"]],
                         "fps": v["r_frame_rate"], "audio": f"{au.get('codec_name')} {au.get('sample_rate')} Hz {au.get('channels')} ch",
                         "ok": abs(dur - plan["duration"]) <= 1 / fps + 0.05 and (v["width"], v["height"]) == (fmt.width, fmt.height)}
    dec = _run(["ffmpeg", "-v", "error", "-i", str(final), "-f", "null", "-"])
    gates["decode"] = {"errors": dec.stderr.strip()[:500], "ok": not dec.stderr.strip()}
    loud = plan.get("loudness", {"lufs": -14.0, "true_peak": -1.0})
    lm = ebur128(final)
    gates["loudness"] = dict(lm, target_lufs=loud["lufs"], max_true_peak=loud["true_peak"], tp_guard=tp_guard,
                             ok=lm["lufs_i"] is not None and abs(lm["lufs_i"] - loud["lufs"]) <= 1.0 and lm["true_peak_dbtp"] <= loud["true_peak"] + 0.05)
    corr = audio_correlation(final, work / "composition/assets/master.wav", plan["duration"])
    gates["audio"] = {"correlation": [round(c, 4) for c in corr], "ok": bool(corr) and min(corr) >= 0.98}
    try:
        import camera_sync_check as cs
        sync = cs.sync_against_source(work)
    except Exception as exc:  # noqa: BLE001 - report the failure, do not hide it
        sync = {"ok": False, "error": str(exc)}
    gates["sync"] = sync
    words = json.loads(((work / "words-reviewed.json") if (work / "words-reviewed.json").exists() else (work / "words.json")).read_text())
    if asr:
        rows = asr_windows(final, words, plan)
        sims = [r["similarity"] for r in rows]
        gates["asr"] = {"windows": rows, "mean": round(float(np.mean(sims)), 3), "min": round(float(np.min(sims)), 3),
                        "ok": float(np.mean(sims)) >= 0.85 and float(np.min(sims)) >= 0.6}
    vd = plan["voice_end"] - plan.get("voice_offset", 0.0)
    ch = plan.get("chapters", [])
    probs = lf.validate_chapters(ch, vd)
    starts = [w["start"] for w in words]
    for k, c in enumerate(ch[1:], 2):
        if not any(-0.05 <= s - c["start"] <= 1.0 for s in starts):
            probs.append(f"chapter {k} does not start on a word")
    gates["chapters"] = {"chapters": [{"t": lf.fmt_ts(c["start"] + (plan.get("voice_offset", 0.0) if i else 0)), "title": c.get("title")}
                                      for i, c in enumerate(ch)], "problems": probs, "ok": not probs}
    segs = plan["segments"]
    prog = json.loads((work / "render/progress.json").read_text()) if (work / "render/progress.json").exists() else {}
    seg_frames = [(s["index"], s["frames"], prog.get(f"segments/seg-{s['index']:03d}", {}).get("got_frames")) for s in segs]
    total_frames = int(v.get("nb_frames") or 0)
    seams = seam_check(final, segs, fmt, qa, fps)
    flagged = [r for r in seams if r["flags"]]
    gates["seams"] = {"segments": len(segs), "frames_expected": sum(s["frames"] for s in segs), "frames_final": total_frames,
                      "segment_frames": seg_frames, "boundaries": seams, "flagged": len(flagged),
                      "ok": not flagged and total_frames == sum(s["frames"] for s in segs)
                      and all(g is None or g == f for _, f, g in seg_frames)}
    sheets = contact_sheets(final, dur, fmt, qa)
    renders = [h for h in prog.values() if h.get("seconds")]
    rt = sum(h["seconds"] for h in renders)
    rf = sum(h["frames"] for h in renders)
    speed = {"render_seconds": round(rt, 1), "frames": rf,
             "minutes_per_video_minute": round(rt / max(1e-6, rf / fps), 2) if rf else None}
    summary = {k: g["ok"] for k, g in gates.items()}
    summary.update({"file": str(final), "duration_s": round(dur, 2), "lufs": lm["lufs_i"], "true_peak": lm["true_peak_dbtp"],
                    "segments": len(segs), "render": speed, "sheets": [s["file"] for s in sheets],
                    "seams_sheet": str(qa / "seams.jpg"), "all_ok": all(g["ok"] for g in gates.values())})
    report = {"summary": summary, "gates": gates, "sheets": sheets}
    (qa / "long-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    md = [f"# Long-form QA · {final.name}", "", f"- File: `{final}` · {dur:.2f} s · {v['width']}x{v['height']} · {plan['style']} · {plan['format']}",
          f"- Render: {speed}", "", "| Gate | OK | Details |", "|---|---|---|"]
    for k, g in gates.items():
        detail = {kk: vv for kk, vv in g.items() if kk not in ("ok", "windows", "boundaries", "segment_frames", "variants")}
        md.append(f"| {k} | {'yes' if g['ok'] else '**NO**'} | `{json.dumps(detail, ensure_ascii=False)[:400]}` |")
    md += ["", "Contact sheets: " + ", ".join(f"`{Path(s['file']).name}`" for s in sheets) + " · seams: `seams.jpg`",
           "", "Nobody has listened to the whole video: metrics and sampled ASR do not replace a listening pass."]
    (qa / "long-report.md").write_text("\n".join(md) + "\n")
    return report
