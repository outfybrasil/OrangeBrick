"""Memory-bounded voice-first mix for long timelines (minutes to hours).

The Reel mixer (reelkit.mix) holds every stem of the cut in memory, fine for 60 s but ~1.5 GB per stem for 30 min.
This mixer streams in blocks: music sections are pre-rendered once to WAV (two bands, as in reelkit.mix),
SFX are decoded once, the voice envelope is computed for the whole timeline at 10 ms resolution, and the
premaster is written block by block. Two passes: the first measures music/SFX/voice levels per 400 ms window
and calibrates the music gain to the same targets as Reels (music median <= -21.5 dB under the voice, bed p95
<= -12 dB); the second writes the mix and the exact balance. Loudness: two-pass loudnorm to plan["loudness"].

    import longmix
    balance = longmix.mix(work, plan, rk.sfx_library())
"""

import json
import subprocess
import wave
from collections import deque
from pathlib import Path

import numpy as np

import reelkit as rk

SR = 48000
BLOCK = SR * 30
WIN = 19200  # 400 ms


def voice_envelope_stream(voice_path, n, offset_samples, hop=480):
    """Held/smoothed voice activity (0..1) per hop over the whole timeline, same constants as reelkit."""
    with wave.open(str(voice_path)) as w:
        rms = []
        while True:
            buf = w.readframes(hop * 2000)
            if not buf:
                break
            x = np.frombuffer(buf, "<i2").astype(np.float32) / 32768
            x = np.pad(x, (0, (-len(x)) % hop))
            rms.append(np.sqrt(np.mean(x.reshape(-1, hop) ** 2, axis=1)))
    rms = np.concatenate(rms) if rms else np.zeros(0)
    lead = np.zeros(offset_samples // hop)
    act = np.concatenate([lead, np.clip((20 * np.log10(rms + 1e-9) + 46) / 10, 0, 1)])
    total = n // hop + 2
    act = np.pad(act, (0, max(0, total - len(act))))[:total]
    look, hold = 12, 65
    held = np.empty_like(act)
    dq = deque()
    # sliding max over [i - hold, i + look]
    for j in range(len(act) + look):
        if j < len(act):
            while dq and act[dq[-1]] <= act[j]:
                dq.pop()
            dq.append(j)
        i = j - look
        if i >= 0:
            while dq[0] < i - hold:
                dq.popleft()
            held[i] = act[dq[0]]
    out = np.empty_like(held)
    level = 0.0
    for i, v in enumerate(held):
        level += (v - level) * (0.35 if v > level else 0.06)
        out[i] = level
    return out


def _env_block(env, s0, s1, hop=480):
    idx = np.arange(s0, s1) / hop
    return np.interp(idx, np.arange(len(env)), env).astype(np.float32)


def _render_section(sec, path, band):
    """Pre-render one music section band to a stereo s16 WAV (looped when asked)."""
    base = rk.MUSIC_FILTERS[sec["mode"]]
    filt = "lowpass=f=200" if band == "low" else "highpass=f=200"
    chain = ",".join(x for x in (base, filt) if x)
    dur = sec["end"] - sec["start"]
    args = ["ffmpeg", "-v", "error", "-y"]
    if sec.get("loop"):
        args += ["-stream_loop", "-1"]
    args += ["-ss", f"{sec['src']:.3f}", "-i", str(sec["track"]), "-t", f"{dur + 0.05:.3f}", "-af", chain,
             "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", str(path)]
    subprocess.run(args, check=True)
    return path


class _Section:
    def __init__(self, sec, tmp, k):
        self.sec = sec
        self.s0 = round(sec["start"] * SR)
        self.files = {b: wave.open(str(_render_section(sec, tmp / f"music-{k}-{b}.wav", b))) for b in ("low", "high")}
        self.n = min(f.getnframes() for f in self.files.values())
        self.n = min(self.n, round((sec["end"] - sec["start"]) * SR))
        fi, fo = round(sec.get("fade_in", 0.012) * SR), round(sec.get("fade_out", 0.025) * SR)
        self.fi, self.fo = max(1, fi), max(1, fo)

    def block(self, b0, b1, band):
        a, b = max(b0, self.s0), min(b1, self.s0 + self.n)
        if b <= a:
            return None
        f = self.files[band]
        f.setpos(a - self.s0)
        x = np.frombuffer(f.readframes(b - a), "<i2").reshape(-1, 2).astype(np.float32) / 32768
        pos = np.arange(a - self.s0, a - self.s0 + len(x))
        ramp = np.minimum(1.0, np.minimum((pos + 1) / self.fi, (self.n - pos) / self.fo)).astype(np.float32)
        return a - b0, x * ramp[:, None]

    def close(self):
        for f in self.files.values():
            f.close()


def mix(work, plan, sfx_lib, music_body_db=-21.0, music_duck=0.80, sfx_offset_db=-7.0, sfx_duck=0.85, low_duck=0.55):
    work = Path(work)
    a = work / "composition/assets"
    tmp = work / "render/mixtmp"
    tmp.mkdir(parents=True, exist_ok=True)
    duration = plan["duration"]
    n = round(duration * SR)
    off = round(plan.get("voice_offset", 0.0) * SR)
    env = voice_envelope_stream(a / "voice-master.wav", n, off)
    sections = [_Section(s, tmp, k) for k, s in enumerate(plan["music"]) if s["mode"] != "silence"]
    gain_secs = [(round(s["start"] * SR), round(s["end"] * SR), rk.db(s.get("gain_db", 0))) for s in plan["music"]]
    cache, used = {}, []
    events = []
    for ev in plan["sound_events"]:
        entry = sfx_lib.get(ev["category"])
        if not entry:
            continue
        rel = entry["files"][ev.get("variant", 0) % len(entry["files"])]
        if rel not in cache:
            cache[rel] = rk.decode(rel).astype(np.float32)
        data = cache[rel]
        mode, length = entry.get("trim", ("head", 0.6))
        length = ev.get("length", length)
        data = data[-round(length * SR):] if mode == "tail" else data[: round(length * SR)]
        data = rk.ramp(data.astype(np.float64).copy(), 0.004, 0.04).astype(np.float32)
        data = data / (np.max(np.abs(data)) or 1.0) * rk.db(ev["gain_db"] + 3 + sfx_offset_db)
        s0 = max(0, round(ev["time"] * SR))
        events.append((s0, data))
        used.append(dict(ev, file=str(rel)))

    def gain_block(b0, b1):
        g = np.ones(b1 - b0, np.float32)
        for s0, s1, gv in gain_secs:
            lo, hi = max(s0, b0), min(s1, b1)
            if hi > lo:
                g[lo - b0:hi - b0] = gv
        return g

    def render_block(b0, b1, vw, music_gain):
        m = b1 - b0
        hi = np.zeros((m, 2), np.float32)
        lo = np.zeros((m, 2), np.float32)
        for s in sections:
            for band, target in (("low", lo), ("high", hi)):
                r = s.block(b0, b1, band)
                if r is not None:
                    st, x = r
                    target[st:st + len(x)] += x
        e = _env_block(env, b0, b1)
        g = gain_block(b0, b1) * music_gain
        music = hi * (g * (1 - music_duck * e))[:, None] + lo * (g * (1 - low_duck * e))[:, None]
        sfx = np.zeros((m, 2), np.float32)
        for s0, data in events:
            lo_, hi_ = max(s0, b0), min(s0 + len(data), b1)
            if hi_ > lo_:
                sfx[lo_ - b0:hi_ - b0] += data[lo_ - s0:hi_ - s0]
        sfx *= (1 - sfx_duck * e)[:, None]
        v = np.zeros(m, np.float32)
        v0, v1 = max(b0, off), min(b1, off + vw.getnframes())
        if v1 > v0:
            vw.setpos(v0 - off)
            v[v0 - b0:v1 - b0] = np.frombuffer(vw.readframes(v1 - v0), "<i2").astype(np.float32) / 32768
        return v, music, sfx

    def levels(x):
        k = len(x) // WIN * WIN
        return 20 * np.log10(np.sqrt(np.mean(x[:k].reshape(-1, WIN) ** 2, axis=1)) + 1e-9) if k else np.zeros(0)

    # pass 1: levels with unit music gain (music normalised on its own reference body)
    vr, mr, sr_ = [], [], []
    with wave.open(str(a / "voice-master.wav")) as vw:
        for b0 in range(0, n, BLOCK):
            b1 = min(n, b0 + BLOCK)
            v, music, sfx = render_block(b0, b1, vw, 1.0)
            vr.append(levels(v))
            mr.append(levels(music.mean(1)))
            sr_.append(levels(sfx.mean(1)))
    vr, mr, sr_ = map(np.concatenate, (vr, mr, sr_))
    playing = mr > -60  # music body = windows where a section is audible (intro, bed, outro)
    body_rms = float(np.sqrt(np.mean(10 ** (mr[playing] / 10)))) if playing.any() else 0.0
    norm = rk.db(music_body_db) / body_rms if body_rms > 1e-6 else 1.0
    vo = vr > (vr.max() - 15) if len(vr) else np.zeros(0, bool)
    music_on = mr > -120
    adj = 0.0
    for _ in range(6):
        g_db = 20 * np.log10(norm) + adj
        mlev = mr + g_db
        bed = 10 * np.log10(10 ** (mlev / 10) + 10 ** (sr_ / 10))
        sel = vo & music_on
        med = float(np.median(mlev[sel] - vr[sel])) if sel.any() else -99.0
        p95 = float(np.percentile(bed[vo] - vr[vo], 95)) if vo.any() else -99.0
        step = min(-21.5 - med, -12.0 - p95, 0.0) if (med > -21.5 or p95 > -12.0) else 0.0
        if abs(step) < 0.2:
            break
        adj += step
    music_gain = norm * rk.db(adj)
    # pass 2: write the premaster (float32 raw), exact balance from the written stems
    raw = tmp / "premaster.f32"
    vr2, mr2, br2, sr2 = [], [], [], []
    peak = 0.0
    with wave.open(str(a / "voice-master.wav")) as vw, open(raw, "wb") as fh:
        for b0 in range(0, n, BLOCK):
            b1 = min(n, b0 + BLOCK)
            v, music, sfx = render_block(b0, b1, vw, music_gain)
            out = music + sfx + v[:, None]
            peak = max(peak, float(np.max(np.abs(out))) if len(out) else 0.0)
            fh.write(out.astype("<f4").tobytes())
            vr2.append(levels(v))
            mr2.append(levels(music.mean(1)))
            sr2.append(levels(sfx.mean(1)))
            br2.append(levels((music + sfx).mean(1)))
    for s in sections:
        s.close()
    vr2, mr2, sr2, br2 = map(np.concatenate, (vr2, mr2, sr2, br2))
    vo = vr2 > (vr2.max() - 15)
    rel = br2[vo] - vr2[vo]
    sel = vo & (mr2 > -120)
    balance = {"bed_minus_voice_median_db": float(np.median(rel)), "bed_minus_voice_p95_db": float(np.percentile(rel, 95)),
               "music_minus_voice_median_db": float(np.median(mr2[sel] - vr2[sel])) if sel.any() else -99.0,
               "sfx_minus_voice_p95_db": float(np.percentile(sr2[vo] - vr2[vo], 95)),
               "windows_bed_within_10db_pct": float(np.mean(rel > -10) * 100), "windows": int(vo.sum()),
               "music_windows_under_voice": int(sel.sum()), "music_gain_adjust_db": round(adj, 2)}
    scale = min(1.0, 0.89 / peak) if peak > 0 else 1.0
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(raw),
                    "-af", f"volume={scale:.6f}", "-c:a", "pcm_s16le", str(a / "premaster.wav")], check=True)
    raw.unlink()
    loud = plan.get("loudness", {"lufs": -14.0, "true_peak": -1.0})
    loudnorm(a / "premaster.wav", a / "master.wav", loud.get("lufs", -14.0), loud.get("true_peak", -1.0) - 1.0)
    (work / "sound-events.json").write_text(json.dumps(used, ensure_ascii=False, indent=1))
    (work / "music-sections.json").write_text(json.dumps(plan["music"], ensure_ascii=False, indent=1, default=str))
    (work / "qa").mkdir(exist_ok=True)
    (work / "qa/balance.json").write_text(json.dumps(balance, indent=2))
    for p in tmp.glob("music-*.wav"):
        p.unlink()
    return balance


def loudnorm(src, dst, target=-14.0, tp=-2.0, lra=11.0):
    """Two-pass loudnorm without the 180 s timeout of the Reel helper (hours of audio)."""
    first = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af",
                            f"loudnorm=I={target}:TP={tp}:LRA={lra}:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    m = json.loads(first[first.rindex("{"): first.rindex("}") + 1])
    af = (f"loudnorm=I={target}:TP={tp}:LRA={lra}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", af, "-ar", str(SR), "-ac", "2",
                    "-c:a", "pcm_s16le", str(dst)], check=True)
    return m


def prepare_voice(work):
    """voice-master.wav from voice-raw.wav with the Reel voice chain (rebuilt when stale; no fixed timeout)."""
    a = Path(work) / "composition/assets"
    out = a / "voice-master.wav"
    if rk._stale(out, a / "voice-raw.wav"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a / "voice-raw.wav"), "-af", rk.VOICE_CHAIN,
                        "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(out)], check=True)
    return out
