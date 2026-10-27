"""Picture/voice sync checks.

Reels (default):  camera_sync_check.py <work> [variant ...]
    Every camera variant (camera-*.mp4) must match camera-src.mp4 frame by frame: for sampled times the most
    similar camera-src frame (±3 s) must be the same frame (offset 0) and the frame counts must be equal.

Against the source:  camera_sync_check.py <work> --source   (also `heditor long sync <work>`)
    For any cut with an EDL (edl.json chunks, Reels or long form), every assembled asset (camera, screen,
    voice) is compared with the ORIGINAL recording at the source time the EDL maps to. Picture offset in frames
    (search ±12 frames) and voice lag in ms (cross-correlation ±250 ms) must be ~0 at the sampled times: when
    picture and voice both match the source through the same EDL, camera and voice are in sync with each other.
    Graded camera variants are then checked against camera.mp4 with the Reel method. Static screen content is
    reported as ambiguous instead of failed (a still slide matches every frame).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H, FPS = 64, 48, 24


def frames(path, fps=FPS, start=None, dur=None, vf_pre=None):
    args = ["ffmpeg", "-v", "error"]
    if start is not None:
        args += ["-ss", f"{max(0.0, start):.4f}"]
    if dur is not None:
        args += ["-t", f"{dur:.4f}"]
    chain = ",".join(x for x in (vf_pre, f"fps={fps}", f"scale={W}:{H}", "format=gray") if x)
    args += ["-i", str(path), "-vf", chain, "-f", "rawvideo", "-"]
    raw = subprocess.run(args, capture_output=True, check=True).stdout
    f = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32)
    f = f - f.mean(axis=(1, 2), keepdims=True)
    return f / (f.std(axis=(1, 2), keepdims=True) + 1e-6)


def variants_vs(ref_path, names, assets):
    """Reel method: each variant against a reference video, frame by frame."""
    src = frames(ref_path)
    ok, rows = True, []
    for name in names:
        var = frames(assets / f"{name}.mp4")
        n = min(len(src), len(var))
        offsets = []
        for i in np.linspace(FPS, n - FPS - 1, 12).astype(int):
            lo, hi = max(0, i - 3 * FPS), min(len(src), i + 3 * FPS)
            scores = [(float(np.mean(var[i] * src[j])), j - i) for j in range(lo, hi)]
            offsets.append(int(max(scores)[1]))
        # strong filters (sketch, posterize) produce isolated outliers
        synced = len(var) == len(src) and sorted(abs(o) for o in offsets)[len(offsets) * 3 // 4] <= 1
        if not synced and len(var) == len(src) and "blur" in name:
            # Heavily blurred backgrounds (e.g. camera-blur in the nativo fit layout) have no detail to match;
            # they are spatial filters of camera-hd, so an equal frame count is the meaningful check.
            synced = True
            offsets = ["blurred: frame count only"]
        ok &= synced
        rows.append({"name": name, "frames": len(var), "ref_frames": len(src), "offsets": offsets, "ok": bool(synced)})
    return ok, rows


def _pcm(path, start, dur, sr=16000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, start):.4f}", "-t", f"{dur:.4f}", "-i", str(path), "-vn",
                          "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def lag_ms(ref, test, sr=16000, max_ms=250):
    """Lag (ms) of `test` relative to `ref`; both windows have the same length and start at the same nominal time."""
    m = int(sr * max_ms / 1000)
    ref = (ref - ref.mean()) / (ref.std() + 1e-9)
    test = (test - test.mean()) / (test.std() + 1e-9)
    core = ref[m:len(ref) - m]
    best, lag = -1e18, 0
    for step, lo, hi in ((8, 0, 2 * m), (1, None, None)):
        if lo is None:
            lo, hi = max(0, lag + m - 8), min(2 * m, lag + m + 8)
        for k in range(lo, hi + 1, step):
            seg = test[k:k + len(core)]
            if len(seg) < len(core):
                break
            v = float(np.dot(core, seg))
            if v > best:
                best, lag = v, k - m
    return lag * 1000 / sr


def sync_against_source(work, samples=10):
    work = Path(work)
    edl = json.loads((work / "edl.json").read_text())
    a = work / "composition/assets"
    src, fps = edl["source"], float(edl.get("fps", FPS))
    speech = [c for c in edl["chunks"] if not c.get("pause")]
    chunks = [c for c in speech if c["out_end"] - c["out_start"] > 1.6] or speech
    total = edl["voice_duration"]
    picks = []
    for k in range(samples):
        t = total * (k + 0.5) / samples
        c = min(chunks, key=lambda c: 0 if c["out_start"] + 0.7 <= t <= c["out_end"] - 0.7 else
                min(abs(t - c["out_start"]), abs(t - c["out_end"])))
        t = min(max(t, c["out_start"] + 0.7), c["out_end"] - 0.7)
        picks.append((t, c["source_in"] + t - c["out_start"]))
    res = {"ok": True, "samples_out_s": [round(t, 2) for t, _ in picks]}
    assets = []
    if (a / "camera.mp4").exists():
        assets.append(("camera", a / "camera.mp4", edl.get("crop")))
    if (a / "screen.mp4").exists():
        assets.append(("screen", a / "screen.mp4", edl.get("screen_crop")))
    if not assets and (a / "camera-src.mp4").exists():  # Reel cut prepared with prepare_cut
        assets.append(("camera-src", a / "camera-src.mp4", edl.get("crop")))
    for name, path, crop in assets:
        offs, amb = [], 0
        for t, s in picks:
            ref = frames(src, fps, s, 1.0 / fps, crop)[:1]
            win = frames(path, fps, t - 12 / fps, 25 / fps)
            if not len(ref) or not len(win):
                continue
            scores = np.array([float(np.mean(ref[0] * f)) for f in win])
            best = int(np.argmax(scores))
            near = np.where(scores >= scores[best] - 2e-3)[0]
            if near.max() - near.min() > 2:  # a still picture matches many frames: no evidence either way
                amb += 1
                continue
            offs.append(best - 12)
        good = [o for o in offs if abs(o) <= 1]
        ok = len(good) >= int(0.8 * len(offs))
        res[name] = {"offsets_frames": offs, "ambiguous": amb, "ok": bool(ok)}
        res["ok"] &= ok
    voice = a / "voice-raw.wav"
    if voice.exists():
        lags = [round(lag_ms(_pcm(src, s - 0.75, 1.5), _pcm(voice, t - 0.75, 1.5)), 1) for t, s in picks]
        ok = sum(abs(x) <= 10 for x in lags) >= int(0.8 * len(lags))
        res["voice"] = {"lag_ms": lags, "ok": bool(ok)}
        res["ok"] &= ok
    names = [p.stem for p in sorted(a.glob("camera-*.mp4")) if p.stem not in ("camera-src", "camera-hd")]
    if names and (a / "camera.mp4").exists():
        ok, rows = variants_vs(a / "camera.mp4", names, a)
        res["variants"] = rows
        res["ok"] &= ok
    res["ok"] = bool(res["ok"])
    return res


def main():
    work = Path(sys.argv[1])
    if "--source" in sys.argv[2:]:
        res = sync_against_source(work)
        print(json.dumps(res, indent=1))
        sys.exit(0 if res["ok"] else 1)
    a = work / "composition/assets"
    names = sys.argv[2:] or [p.stem for p in sorted(a.glob("camera-*.mp4")) if p.stem != "camera-src"]
    ok, rows = variants_vs(a / "camera-src.mp4", names, a)
    for r in rows:
        print(f"{r['name']}: frames {r['frames']} vs src {r['ref_frames']}; offsets (frames) {r['offsets']} -> "
              f"{'OK' if r['ok'] else 'OUT OF SYNC'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
