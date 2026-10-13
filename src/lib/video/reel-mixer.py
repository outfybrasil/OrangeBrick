import argparse
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
    bgm = assets_dir / "bgm.mp3"
    impact = assets_dir / "impact.wav"
    whoosh = assets_dir / "whoosh.wav"
    coin = assets_dir / "coin.wav"
    powerup = assets_dir / "powerup.wav"

    if not voice.exists():
        print(f"Error: {voice} not found.")
        sys.exit(1)

    fade_st = round(max(total_duration - 2.5, 5.0), 1) if total_duration else 40.0
    voice_pad = f",apad=whole_dur={total_duration}" if total_duration else ""

    # Dynamic delay markers based on total duration
    d = total_duration or 42.0
    sfx2_ms = int(d * 0.16 * 1000)
    sfx3_ms = int(d * 0.35 * 1000)
    sfx4_ms = int(d * 0.55 * 1000)
    sfx5_ms = int(d * 0.72 * 1000)
    sfx6_ms = int(max(d - 4.5, 0) * 1000)

    # Filter complex to mix voice, ducked background music and keyframe SFX
    filter_complex = (
        f"[0:a]volume=1.2{voice_pad}[v];"
        f"[1:a]volume=0.18,afade=t=out:st={fade_st}:d=2.5[m];"
        f"[2:a]adelay=100|100,volume=0.4[sfx1];"
        f"[3:a]adelay={sfx2_ms}|{sfx2_ms},volume=0.3[sfx2];"
        f"[4:a]adelay={sfx3_ms}|{sfx3_ms},volume=0.35[sfx3];"
        f"[5:a]adelay={sfx4_ms}|{sfx4_ms},volume=0.35[sfx4];"
        f"[3:a]adelay={sfx5_ms}|{sfx5_ms},volume=0.3[sfx5];"
        f"[2:a]adelay={sfx6_ms}|{sfx6_ms},volume=0.4[sfx6];"
        "[v][m][sfx1][sfx2][sfx3][sfx4][sfx5][sfx6]amix=inputs=8:duration=first:dropout_transition=2[aout]"
    )

    cmd = [
        ffmpeg, "-y",
        "-i", str(voice),
        "-i", str(bgm),
        "-i", str(impact),
        "-i", str(whoosh),
        "-i", str(coin),
        "-i", str(powerup),
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        "-c:a", "aac",
        "-b:a", "192k",
        str(out_path)
    ]

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
