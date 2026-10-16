#!/usr/bin/env python3
"""heditor doctor: verifies tools, python packages, browser, assets and brand. Exit 1 if something required is missing."""
import importlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HOME = Path(os.environ.get("HEDITOR_HOME", "~/.heditor")).expanduser()
ASSETS = HOME / "assets"
SKILL = Path(__file__).resolve().parents[1]
rows, bad = [], 0


def check(name, ok, hint="", required=True):
    global bad
    rows.append(("OK " if ok else ("MISS" if required else "warn"), name, "" if ok else hint))
    if required and not ok:
        bad += 1


for tool in ["ffmpeg", "ffprobe", "node", "npx", "git", "curl"]:
    check(tool, shutil.which(tool) is not None, "install it and re-run setup.sh")
check("python 3.10-3.13", (3, 10) <= sys.version_info[:2] <= (3, 13), f"current {sys.version.split()[0]}")
for mod in ["numpy", "PIL", "faster_whisper", "mediapipe", "playwright", "pytest"]:
    try:
        importlib.import_module(mod)
        check(f"python: {mod}", True)
    except Exception as exc:  # noqa: BLE001
        check(f"python: {mod}", False, f"{exc}; run setup.sh")
chrome = os.environ.get("HEDITOR_CHROME", "")
check("chrome for previews/render", bool(chrome) and Path(chrome).exists(), "run: npx hyperframes@0.8.147 browser ensure")
fonts = list((ASSETS / "fonts").glob("*.ttf"))
check(f"fonts ({len(fonts)})", len(fonts) >= 15, "run setup.sh")
check("gsap", (ASSETS / "js/gsap.min.js").exists(), "run setup.sh")
check("face model", (ASSETS / "models/blaze_face_short_range.tflite").exists(), "run setup.sh")
for mod, attr in [("onnxruntime", None), ("cv2", "ximgproc")]:
    try:
        m = importlib.import_module(mod)
        check(f"python: {mod}" + (f".{attr}" if attr else ""), attr is None or hasattr(m, attr),
              "pip install opencv-contrib-python (layered edits)", required=False)
    except Exception as exc:  # noqa: BLE001
        check(f"python: {mod}", False, f"{exc}; re-run setup.sh (needed only for layered edits)", required=False)
check("person/hand models", all((ASSETS / f"models/{f}").exists() for f in
                                 ("selfie_multiclass_256x256.tflite", "hand_landmarker.task")),
      "run setup.sh (or they download on first use)", required=False)
catalog = json.loads((SKILL / "assets/catalog.json").read_text())
n_sfx = sum(len(v) for v in catalog["sfx"].values())
have_sfx = len(list((ASSETS / "sfx").glob("*"))) if (ASSETS / "sfx").exists() else 0
have_music = len(list((ASSETS / "music").glob("*.mp3"))) if (ASSETS / "music").exists() else 0
check(f"sfx {have_sfx}/{n_sfx}", have_sfx >= n_sfx * 0.9, "run setup.sh (or --no-audio and bring your own)", required=False)
check(f"music {have_music}/{len(catalog['music'])}", have_music >= len(catalog["music"]) * 0.9, "run setup.sh", required=False)
brand = HOME / "brand.json"
handle = json.loads(brand.read_text()).get("handle", "") if brand.exists() else ""
check("brand.json", brand.exists() and handle not in ("", "@yourhandle"),
      f"edit {brand} (name, handle, colors, logo)", required=False)
try:
    v = subprocess.run(["npx", "--yes", "hyperframes@0.8.147", "--version"], capture_output=True, text=True, timeout=180)
    check("hyperframes@0.8.147", v.returncode == 0, v.stderr[-200:])
except Exception as exc:  # noqa: BLE001
    check("hyperframes@0.8.147", False, str(exc))

for status, name, hint in rows:
    print(f"[{status}] {name}" + (f"  -> {hint}" if hint else ""))
print("heditor is ready." if not bad else f"{bad} required item(s) missing.")
sys.exit(1 if bad else 0)
