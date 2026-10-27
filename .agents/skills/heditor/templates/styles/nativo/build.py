"""Style `nativo`: clean native edit (cuts + animated captions). Runs as-is.

Only what a native Reel needs: the speech cut at clean word boundaries (prepare.py), jump cuts that read as new
shots (alternating 1.0/1.075 zoom centred on the face of each segment, 1.5% breathing inside it) and animated
word-by-word captions. No music, no sound effects, no motion graphics, no end card unless the user asks.

Copy into the work folder (`heditor new <work> <video> --style nativo` does it), fill prepare.py, then:
    heditor produce <work> none 0
"""
import json
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, os.environ.get("HEDITOR_KIT", str(Path.home() / ".heditor/kit")))
import reelkit as rk  # noqa: E402

WORK = Path(__file__).resolve().parent
# "full": the camera fills 1080x1920 (vertical recordings, or a sharp landscape speaker cropped to 9:16 on the face)
# "fit": the camera fitted to the width over a blurred copy of itself (small or wide sources, e.g. meeting tiles)
# "auto": full when the speaker crop is portrait or at least 1080 px tall, fit otherwise
MODE = "auto"
CAPTION_MODE = "pill"      # "pill": black on a light-yellow pill (default) | "text": active word in yellow
USE_MUSIC = False          # True only when the user asks for a soft bed (heditor produce <work> music:<id> <src_s>)
MAX_DURATION = None        # seconds; set (<= 180) for cuts longer than 70 s
SEED = 20261016
SAFE_TOP = rk.SAFE_TOP
CAPTION_TOP = 1222         # default caption band (y 1222-1472), above the bottom UI area


def load():
    words_file = WORK / "words-reviewed.json" if (WORK / "words-reviewed.json").exists() else WORK / "words.json"
    words = rk.load_words(words_file)
    edl = json.loads((WORK / "edl.json").read_text())
    return words, round(edl["voice_duration"], 3)


def _size(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout
    return tuple(map(int, out.strip().split(",")[:2]))


def choose_mode(src_w, src_h):
    if MODE in ("full", "fit"):
        return MODE
    return "full" if (src_h > src_w or src_h >= 1080) else "fit"


def native_camera(work, faces):
    """camera-native.mp4: 9:16 crop of the source around the median face, 1080x1920, frame for frame."""
    a = Path(work) / "composition/assets"
    src, out = a / "camera-src.mp4", a / "camera-native.mp4"
    w, h = _size(src)
    cw, ch = min(w, round(h * 9 / 16)), min(h, round(w * 16 / 9))
    cw, ch = cw - cw % 2, ch - ch % 2
    fx = sorted(f["x"] for f in faces)[len(faces) // 2] if faces else 0.5
    fy = sorted(f["y"] for f in faces)[len(faces) // 2] if faces else 0.45
    x = min(max(0, round(fx * w - cw / 2)), w - cw)
    y = min(max(0, round(fy * h - ch * 0.42)), h - ch)
    if rk._stale(out, src):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                        f"crop={cw}:{ch}:{x}:{y},scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0,"
                        "eq=contrast=1.03:saturation=1.05,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-an", str(out)], check=True, timeout=1800)
    return out.name


def layout(mode, src_w, src_h):
    """Camera card geometry: full canvas, or fitted to the width between the safe top and the caption band."""
    if mode == "full":
        return 1080, 1920, {"hero": {"x": 0, "y": 0, "scale": 1}}
    card_w, card_h = 1080, round(1080 * src_h / src_w / 2) * 2
    room = CAPTION_TOP - 30 - (SAFE_TOP + 30)
    scale = min(1.0, room / card_h)
    y = SAFE_TOP + 30 + (room - card_h * scale) / 2
    return card_w, card_h, {"hero": {"x": round((1080 - card_w * scale) / 2, 2), "y": round(y, 2), "scale": round(scale, 4)}}


def css(mode):
    radius = 0 if mode == "full" else 34
    tint = ("background:linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,.35))" if mode == "full"
            else "display:none")
    return rf"""
@font-face{{font-family:Inter;src:url('assets/Inter-VF.ttf');font-weight:100 900;font-display:block}}
#bg{{background:#000}}
.glow,.floor,#horizon,.speed,.conf,#border,#rig-aura,#vignette{{display:none}}
#grain{{opacity:0}}
#frame{{border-radius:{radius}px;box-shadow:{'none' if mode == 'full' else '0 24px 70px rgba(0,0,0,.55)'}}}
#cam-tint{{{tint}}}
#cam-bg{{position:absolute;left:0;top:0;width:1080px;height:1920px;object-fit:cover;z-index:1}}
.cap{{font-family:Inter;font-weight:900;font-size:82px;line-height:1.12;text-transform:none;letter-spacing:-.5px;
  -webkit-text-stroke:11px #000;text-shadow:0 5px 16px rgba(0,0,0,.55)}}
.cap.long{{font-size:72px}}
.cap .w{{opacity:1}}
"""


def build(track, drop_s):
    rk.setup_assets(WORK)
    a = WORK / "composition/assets"
    rk.prepare_voice(WORK)
    words, voice_end = load()
    src_w, src_h = _size(a / "camera-src.mp4")
    mode = choose_mode(src_w, src_h)
    world_back = ""
    if mode == "full":
        faces = rk.track_faces(WORK, video="camera-src.mp4")
        cam = native_camera(WORK, faces)
        faces = rk.track_faces(WORK, video=cam)
        card_w, card_h, states = layout(mode, 1080, 1920)
    else:
        rk.prepare_camera(WORK, width=1080)
        cam = "camera-hd.mp4"
        cw, ch = _size(a / cam)
        blur = rk.styled_camera(WORK, "blur", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                                              "boxblur=28:2,eq=brightness=-0.12:saturation=1.15")
        world_back = (f'<video id="cam-bg" class="clip" data-start="0" data-duration="{voice_end:.4f}" '
                      f'data-track-index="1" src="assets/{blur}" muted playsinline></video>')
        faces = rk.track_faces(WORK, video=cam)
        card_w, card_h, states = layout(mode, cw, ch)
    duration = round(voice_end, 3)
    caps = rk.captions(words, voice_end)
    k = {"voice_end": voice_end, "duration": duration, "seed": SEED, "rigStates": states, "rig": [[0.0, "hero"]],
         "segments": rk.jump_segments(WORK, faces, voice_end)}
    videos = [{"id": "cam", "start": 0, "duration": voice_end, "track": 0, "src": cam}]
    brand = rk.load_brand(WORK)
    markup = rk.page(title=f"{brand['name']} nativo", duration=duration, card_w=card_w, card_h=card_h,
                     face_origin="50% 42%", videos=videos, scenes_html="", css=css(mode), js="", keys=k, caps=caps,
                     world_back=world_back, caption_mode=CAPTION_MODE, brand_work=WORK)
    (WORK / "composition/index.html").write_text(markup)
    music = []
    if USE_MUSIC and track and track != "none":
        music = [{"start": 0.0, "end": duration, "mode": "full", "gain_db": -3, "track": track, "src": drop_s,
                  "fade_in": 0.4, "fade_out": 0.8}]
    plan = {"style": "nativo", "mode_camera": mode, "duration": duration, "voice_end": voice_end, "keys": k,
            "captions": caps, "sound_events": [], "music": music, "end_card": False}
    if MAX_DURATION:
        plan["max_duration"] = MAX_DURATION
    (WORK / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    (WORK / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=2))
    return plan
