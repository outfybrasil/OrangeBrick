import argparse
import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

def get_ffmpeg():
    cmd = shutil.which("ffmpeg")
    if cmd:
        return cmd
    candidates = [
        Path.home() / "AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-essentials_build/bin/ffmpeg.exe",
        Path("C:/Program Files/ffmpeg/bin/ffmpeg.exe"),
        Path("C:/ffmpeg/bin/ffmpeg.exe")
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return "ffmpeg"

def mix(work_dir: Path, assets_dir: Path, out_path: Path, total_duration: float = None):
    ffmpeg = get_ffmpeg()
    voice = work_dir / "voice.mp3"
    if not voice.exists():
        print(f"Error: {voice} not found.")
        sys.exit(1)

    plan_path = work_dir / "production.json"
    plan = json.loads(plan_path.read_text(encoding="utf-8")) if plan_path.exists() else {}
    rng = random.Random(plan.get("variation", 0))
    d = total_duration or 42.0
    starts = plan.get("sceneStarts", [0, d * .16, d * .35, d * .55, d * .72, d - 4.5])
    tracks = sorted(assets_dir.glob("bgm*.mp3"))
    track_groups = {}
    for track in tracks:
        group = "shadow" if track.stem.startswith("bgm_shadow") else track.stem
        track_groups.setdefault(group, []).append(track)
    track_groups = [track_groups[group] for group in sorted(track_groups)]
    selected_group = rng.choice(track_groups) if track_groups else []
    bgm = rng.choice(selected_group) if selected_group else None
    effects = [name for name in ("impact", "whoosh", "coin", "powerup")
               if (assets_dir / f"{name}.wav").exists()]
    selected_starts = [starts[0], *rng.sample(starts[1:-1], min(2, len(starts[1:-1]))), starts[-1]]
    selected_starts.sort()
    cmd = [ffmpeg, "-y", "-i", str(voice)]
    filters = [f"[0:a]aresample=48000,volume=1.2,apad,atrim=duration={d},asplit=2[v][side]"]
    labels = ["[v]"]
    input_index = 1
    selected_effects = []
    if bgm:
        cmd.extend(["-stream_loop", "-1", "-i", str(bgm)])
        offset = rng.choice([0, 8, 16, 24])
        filters.append(
            f"[{input_index}:a]aresample=48000,atrim=start={offset}:duration={d},"
            f"asetpts=PTS-STARTPTS,loudnorm=I=-24:TP=-4:LRA=7,aresample=48000,"
            f"volume=1.0,afade=t=in:d=0.8,"
            f"afade=t=out:st={max(d - 2.5, 0)}:d=2.5[music]"
        )
        filters.append("[music][side]sidechaincompress=threshold=0.08:ratio=3:attack=20:release=420[m]")
        labels.append("[m]")
        input_index += 1
    else:
        filters.append("[side]anullsink")

    previous = None
    for start in selected_starts:
        choices = [effect for effect in effects if effect != previous] or effects
        if not choices:
            break
        effect = rng.choice(choices)
        previous = effect
        selected_effects.append(effect)
        cmd.extend(["-i", str(assets_dir / f"{effect}.wav")])
        delay = int(max(start, 0.08) * 1000)
        gain = rng.choice([0.12, 0.16, 0.20])
        label = f"sfx{input_index}"
        filters.append(
            f"[{input_index}:a]aresample=48000,atrim=duration=1.2,"
            f"asetpts=PTS-STARTPTS,afade=t=out:st=0.8:d=0.4,"
            f"volume={gain},adelay={delay}:all=1[{label}]"
        )
        labels.append(f"[{label}]")
        input_index += 1

    plan["backgroundMusic"] = bgm.name if bgm else None
    plan["soundEffects"] = selected_effects
    if plan_path.exists():
        plan_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(f"Background music: {bgm.name if bgm else 'none'}")
    print(f"Sound effects: {', '.join(selected_effects) if selected_effects else 'none'}")

    filters.append(
        "".join(labels) + f"amix=inputs={len(labels)}:duration=first:"
        "dropout_transition=0:normalize=0,alimiter=limit=0.95:level=false:latency=true[aout]"
    )
    cmd.extend([
        "-filter_complex", ";".join(filters), "-map", "[aout]",
        "-t", str(d), "-c:a", "aac", "-b:a", "192k", str(out_path)
    ])

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"SUCCESS: Master audio generated at {out_path}")
    else:
        print(f"FFmpeg mix error:\n{res.stderr}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--assets-dir", required=True)
    parser.add_argument("--duration", type=float, default=None)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    mix(Path(args.work_dir), Path(args.assets_dir), Path(args.out), args.duration)

if __name__ == "__main__":
    main()
