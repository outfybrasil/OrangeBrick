"""longkit: composition builder for long-form, multi-format edits (classes, lives, YouTube videos).

A long edit is one global timeline (all times absolute, in seconds) written as JS tween calls plus HTML
elements. `write_page()` emits it either whole (composition/index.html, used by previews) or for a window
[start, end) as a self-contained segment composition (segments/seg-NNN/index.html) whose GSAP timeline is the
global one played from `start` to `end` (`tl.tweenFromTo`), so a frame renders identically in the whole page and
in its segment. Captions outside the window are left out; layout/card events before it are kept so the state at
`start` is exact.

Typical build.py (see templates/long/build.py):
    import longkit as lk
    plan = lk.build(WORK, lower_thirds=[...], set_pieces=[...], callouts=None, track="music:282")

Inputs in the work dir: long.json (format, style, kind, intro, cta, captions), edl.json, words-reviewed.json,
chapters.json, layouts.json (optional), composition/assets/{screen,camera}.mp4 + voice-master.wav.
"""

import hashlib
import html
import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import formats as fm
import longform as lf
import reelkit as rk
import stylepacks as sp

FONT_FILES = {
    "Anton": [("Anton-Regular.ttf", "400")], "Bebas Neue": [("BebasNeue-Regular.ttf", "400")],
    "Geist": [("Geist-VF.ttf", "100 900")], "Inter": [("Inter-VF.ttf", "100 900")],
    "JetBrains Mono": [("JetBrainsMono-VF.ttf", "100 800")],
    "IBM Plex Mono": [("IBMPlexMono-Regular.ttf", "400"), ("IBMPlexMono-Bold.ttf", "700")],
    "VT323": [("VT323-Regular.ttf", "400")], "Press Start 2P": [("PressStart2P-Regular.ttf", "400")],
    "Playfair Display": [("PlayfairDisplay-VF.ttf", "400 900")], "Fraunces": [("Fraunces-VF.ttf", "100 900")],
    "DM Serif Display": [("DMSerifDisplay-Regular.ttf", "400")], "Caveat": [("Caveat-VF.ttf", "400 700")],
    "B612 Mono": [("B612Mono-Regular.ttf", "400"), ("B612Mono-Bold.ttf", "700")], "Fredoka": [("Fredoka-VF.ttf", "300 700")],
}
WORDS = {
    "pt": {"chapter": "Capítulo", "next": "Assista o próximo", "summary": "Resumo"},
    "en": {"chapter": "Chapter", "next": "Watch next", "summary": "Summary"},
}
CARD_S = 3.0          # chapter card on screen
LOWER_S = 5.0         # default lower third
CALLOUT_S = 2.4       # keyword chip


# ---------------------------------------------------------------- config

def load_config(work):
    work = Path(work)
    cfg = json.loads((work / "long.json").read_text())
    if os.environ.get("HEDITOR_LONG_FORMAT"):
        cfg["format"] = os.environ["HEDITOR_LONG_FORMAT"]
    return cfg


def lang_words(brand):
    return WORDS.get(brand.get("lang", "pt"), WORDS["en"])


def font_faces(families):
    css = []
    for fam in sorted(set(families)):
        for file, weight in FONT_FILES.get(fam, []):
            style = "italic" if "Italic" in file else "normal"
            css.append(f"@font-face{{font-family:'{fam}';src:url('assets/{file}');font-weight:{weight};font-style:{style};font-display:block}}")
    css.append("@font-face{font-family:'Playfair Display';src:url('assets/PlayfairDisplay-Italic-VF.ttf');font-weight:400 900;font-style:italic;font-display:block}")
    return "".join(css)


def text_width(text, family, px, weight=400):
    """Width in px with the real font (PIL), used to fit captions and titles without overflow."""
    from PIL import ImageFont
    file = FONT_FILES.get(family, FONT_FILES["Geist"])[0][0]
    font = ImageFont.truetype(str(rk.FONTS / file), int(px))
    try:
        axes = font.get_variation_axes()
        values = []
        for a in axes:
            is_weight = "eight" in str(a.get("name", "")) or "wght" in str(a.get("name", ""))
            values.append(min(max(float(weight), a["minimum"]), a["maximum"]) if is_weight else a["default"])
        if values:
            font.set_variation_by_axes(values)
    except (OSError, AttributeError, KeyError):
        pass
    return font.getlength(text)


def fit_px(lines, family, px, weight, max_w, upper=False):
    widest = max((text_width(ln.upper() if upper else ln, family, px, weight) for ln in lines), default=0)
    return px if widest <= max_w else max(12, math.floor(px * max_w / widest))


# ---------------------------------------------------------------- media helpers

def probe_size(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True, check=True).stdout.strip()
    w, h = out.split(",")[:2]
    return int(w), int(h)


def face_focus(path, samples=24, default=(0.5, 0.42)):
    """Median face centre over `samples` frames (bounded memory: one frame at a time)."""
    try:
        import mediapipe as mp
        import numpy as np
        from mediapipe.tasks.python import BaseOptions, vision
    except ImportError:
        return default
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout.strip() or 0)
    w, h = probe_size(path)
    det = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(
        base_options=BaseOptions(model_asset_path=str(rk.MODELS / "blaze_face_short_range.tflite")), min_detection_confidence=0.4))
    xs, ys = [], []
    for k in range(samples):
        t = dur * (k + 0.5) / samples
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(path), "-frames:v", "1", "-f", "rawvideo",
                              "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        if len(raw) != w * h * 3:
            continue
        r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.frombuffer(raw, np.uint8).reshape(h, w, 3).copy()))
        if r.detections:
            b = max(r.detections, key=lambda d: d.categories[0].score).bounding_box
            xs.append((b.origin_x + b.width / 2) / w)
            ys.append((b.origin_y + b.height / 2) / h)
    det.close()
    if not xs:
        return default
    return float(np.median(xs)), float(np.median(ys))


def _cached_focus(work, camera):
    """face_focus() cached in qa/camera-focus.json until camera.mp4 changes."""
    path = Path(work) / "qa/camera-focus.json"
    key = str(camera.stat().st_mtime_ns)
    if path.exists():
        data = json.loads(path.read_text())
        if data.get("key") == key:
            return tuple(data["focus"])
    focus = face_focus(camera)
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps({"key": key, "focus": list(focus)}))
    return focus


def graded_camera(work, pack):
    """camera-<slug>.mp4 with the pack's grade (rebuilt when older than camera.mp4); None when the pack has none."""
    a = Path(work) / "composition/assets"
    if not pack.get("camera_grade") or not (a / "camera.mp4").exists():
        return None
    out = a / f"camera-{pack['slug']}.mp4"
    if rk._stale(out, a / "camera.mp4"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a / "camera.mp4"), "-vf", pack["camera_grade"] + ",format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-an", str(out)], check=True)
    return out.name


# ---------------------------------------------------------------- geometry

def inner(box, media, focus=(0.5, 0.5), zoom=None, max_zoom=2.5):
    """{x, y, scale} (origin 0 0) that make `media` (w, h) cover `box` (Rect), centred on `focus` or on `zoom`."""
    mw, mh = media
    k = max(box.w / mw, box.h / mh)
    if zoom:
        rx, ry, rw, rh = zoom
        k *= min(max_zoom, max(1.0, min(1 / max(rw, 1e-3), 1 / max(rh, 1e-3)) * min(box.w / mw, box.h / mh) / k))
        cx, cy = (rx + rw / 2) * mw, (ry + rh / 2) * mh
    else:
        cx, cy = focus[0] * mw, focus[1] * mh
    x = min(0.0, max(box.w - mw * k, box.w / 2 - cx * k))
    y = min(0.0, max(box.h - mh * k, box.h / 2 - cy * k))
    return {"x": round(x, 2), "y": round(y, 2), "scale": round(k, 5)}


def cam_box(rect, shape):
    if rect is None or shape != "circle":
        return rect
    s = min(rect.w, rect.h)
    return fm.Rect(rect.x + (rect.w - s) // 2, rect.y + (rect.h - s) // 2, s, s)


# ---------------------------------------------------------------- timeline container

class Timeline:
    """Events = (t0, t1, js, caption?) and elements = (t0, t1, html, caption?) on the absolute timeline."""

    def __init__(self):
        self.events, self.elements, self.sounds, self.css = [], [], [], {}

    def js(self, t0, code, t1=None, cap=False):
        self.events.append((float(t0), float(t1 if t1 is not None else t0), code, cap))

    def el(self, t0, t1, markup, cap=False):
        self.elements.append((float(t0), float(t1), markup, cap))

    def sfx(self, t, category, gain_db, context, **kw):
        if not category:  # style packs without sound design (e.g. nativo) set the category to None
            return
        self.sounds.append(dict({"time": round(max(0.0, t), 3), "category": category, "variant": 0,
                                 "gain_db": gain_db, "context": context}, **kw))

    def window(self, start, end, margin=2.0):
        """Events/elements a segment [start, end) needs. Events are absolute GSAP calls whose first tween may start
        a little before the time they were registered at (anticipation), so a margin is kept on both sides; extra
        future events are harmless (they never change earlier frames)."""
        ev = [e for e in self.events if e[0] < end + margin and (not e[3] or e[1] > start - margin)]
        el = [e for e in self.elements if not e[3] or (e[0] < end + margin and e[1] > start - margin)]
        return ev, el


def _j(v):
    return json.dumps(v, ensure_ascii=False)


# ---------------------------------------------------------------- CSS

def base_css(fmt, pack):
    f, c, fr, ov = pack["fonts"], pack["captions"], pack["frame"], pack["overlay"]
    W, H = fmt.width, fmt.height
    u = W / 1920 if not fmt.vertical and fmt.key != "1:1" and fmt.key != "4:5" else W / 1080
    lb = round(H * 0.12)
    return f"""
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--font-body),sans-serif}}
#stage{{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:var(--bg)}}
#world{{position:absolute;inset:0;background:{fr['world']};transform-origin:50% 50%}}
.box{{position:absolute;overflow:hidden;background:#000;box-shadow:{fr['shadow']};opacity:0}}
.box::after{{content:'';position:absolute;inset:0;border:{fr['border']};border-radius:inherit;pointer-events:none}}
#scr{{border-radius:{round(fr['screen_radius'] * u)}px;z-index:2}}
#cam{{border-radius:{'50%' if fr['camera_shape'] == 'circle' else str(round(fr['camera_radius'] * u)) + 'px'};z-index:4}}
.inner{{position:absolute;left:0;top:0;transform-origin:0 0}}
.inner video{{position:absolute;left:0;top:0;display:block}}
#fx{{position:absolute;inset:0;z-index:6;pointer-events:none}}
#caps{{position:absolute;z-index:35;pointer-events:none}}
.lcap{{position:absolute;left:0;right:0;bottom:0;text-align:center;visibility:hidden;font-family:var(--font-caption),sans-serif;
  font-weight:{c['weight']};color:var(--cap-fg);line-height:1.18;{'text-transform:uppercase;' if c['case'] == 'upper' else ''}{'text-transform:lowercase;' if c['case'] == 'lower' else ''}}}
.lcap .ln{{display:table;margin:0 auto;white-space:nowrap;padding:.06em .38em .1em;border-radius:.22em;background:var(--cap-box);
  {('-webkit-text-stroke:' + c['stroke'] + ';paint-order:stroke fill;') if c.get('stroke') else ''}text-shadow:0 3px 10px rgba(0,0,0,.55)}}
.lcap .w{{display:inline-block;padding:0 .08em;border-radius:.16em}}
#cards{{position:absolute;inset:0;z-index:30;pointer-events:none}}
.card{{position:absolute;opacity:0;visibility:hidden}}
.dim{{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;z-index:29}}
.dimw{{z-index:3}}
#grain{{position:absolute;left:-256px;top:-256px;width:{W + 512}px;height:{H + 512}px;background:url('assets/grain.png');opacity:{ov['grain']};z-index:40;pointer-events:none;mix-blend-mode:overlay}}
#vig{{position:absolute;inset:0;z-index:39;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,{ov['vignette']}))}}
#scan{{position:absolute;inset:0;z-index:38;pointer-events:none;opacity:{.35 if ov.get('scanlines') else 0};background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0 2px,transparent 2px 5px)}}
.lb{{position:absolute;left:0;width:{W}px;height:{lb}px;background:#000;z-index:37}}#lb-t{{top:-{lb}px}}#lb-b{{bottom:-{lb}px}}
#flash{{position:absolute;inset:0;background:#fff;opacity:0;z-index:45;pointer-events:none}}
.ctag{{position:absolute;left:{fmt.safe.x}px;top:{fmt.safe.y}px;z-index:22;opacity:0;font:600 {round(24 * u)}px var(--font-body);
  color:var(--text);background:color-mix(in srgb,var(--bg) 82%,transparent);padding:{round(8 * u)}px {round(16 * u)}px;border-radius:{round(10 * u)}px;
  border-left:{max(3, round(5 * u))}px solid var(--accent)}}
.ctag b{{color:var(--accent);font-weight:800;margin-right:.5em}}
.chip{{position:absolute;z-index:21;opacity:0;font:800 {round(34 * u)}px var(--font-display);color:var(--bg);background:var(--accent);
  padding:{round(10 * u)}px {round(22 * u)}px;border-radius:{round(12 * u)}px;box-shadow:0 10px 30px rgba(0,0,0,.45);white-space:nowrap}}
"""


def card_css(fmt, pack):
    """Chapter/intro/outro cards; the pack's card kind changes the look, the markup stays the same."""
    W, H = fmt.width, fmt.height
    u = min(W, H) / 1080
    kind = pack["chapter_card"]
    common = f"""
.ccard{{left:{round(W * .12)}px;top:{round(H * .5 - 170 * u)}px;width:{round(W * .76)}px;padding:{round(36 * u)}px {round(48 * u)}px;text-align:left}}
.ccard .num{{font:700 {round(28 * u)}px var(--font-body);letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}}
.ccard .ttl{{font-family:var(--font-display);font-size:{round(84 * u)}px;line-height:1.04;margin-top:{round(14 * u)}px;color:var(--text);text-wrap:balance}}
.ccard .rule{{height:{max(3, round(5 * u))}px;width:0;background:var(--accent);margin-top:{round(22 * u)}px}}
.full{{left:0;top:0;width:{W}px;height:{H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
  background:{pack['frame']['world']};padding:{fmt.safe.y}px {fmt.safe.x}px}}
.full .kick{{font:700 {round(30 * u)}px var(--font-body);letter-spacing:.2em;text-transform:uppercase;color:var(--accent)}}
.full .big{{font-family:var(--font-display);font-size:{round(110 * u)}px;line-height:1.02;margin-top:{round(18 * u)}px;color:var(--text);max-width:{fmt.safe.w}px;text-wrap:balance}}
.full .sub{{font:500 {round(38 * u)}px var(--font-body);color:var(--muted);margin-top:{round(22 * u)}px;max-width:{round(fmt.safe.w * .8)}px;text-wrap:balance}}
.full .logo{{width:{round(120 * u)}px;height:{round(120 * u)}px;object-fit:contain;margin-bottom:{round(18 * u)}px}}
.cta-row{{display:flex;gap:{round(28 * u)}px;align-items:center;justify-content:center;margin-top:{round(30 * u)}px}}
.btn{{position:relative;min-width:{round(380 * u)}px;height:{round(96 * u)}px;border-radius:{round(48 * u)}px;background:var(--alert);color:#fff;
  font:800 {round(40 * u)}px var(--font-body);display:flex;align-items:center;justify-content:center}}
.btn span{{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:{round(12 * u)}px}}
.btn .b2{{opacity:0}}
.btn.follow{{background:var(--accent);color:#000}}
.handle{{font:700 {round(44 * u)}px var(--font-body);color:var(--accent);margin-top:{round(10 * u)}px}}
.slots{{display:flex;gap:{round(36 * u)}px;margin-top:{round(34 * u)}px}}
.slot{{width:{round(420 * u)}px;height:{round(236 * u)}px;border:{max(2, round(3 * u))}px dashed var(--muted);border-radius:{round(14 * u)}px;
  display:flex;align-items:flex-end;justify-content:center;padding-bottom:{round(14 * u)}px;font:600 {round(26 * u)}px var(--font-body);color:var(--muted)}}
#finger{{position:absolute;width:{round(110 * u)}px;height:{round(110 * u)}px;color:#fff;opacity:0;z-index:31;filter:drop-shadow(0 8px 14px rgba(0,0,0,.6))}}
#finger svg{{width:100%;height:100%;fill:rgba(8,22,38,.85)}}
.lt{{position:absolute;opacity:0;z-index:23}}
.lt .n{{font-family:var(--font-display);font-size:{round(48 * u)}px;line-height:1.05;color:var(--text)}}
.lt .r{{font:600 {round(26 * u)}px var(--font-body);color:var(--muted);margin-top:{round(6 * u)}px}}
"""
    kinds = {
        "slate": f".ccard{{background:color-mix(in srgb,var(--bg) 90%,transparent);border:2px solid var(--accent);border-radius:{round(18 * u)}px;box-shadow:0 30px 80px rgba(0,0,0,.6)}}",
        "serif": f".ccard{{background:transparent;text-align:center}}.ccard .ttl{{font-weight:400;font-style:italic}}.ccard .num{{letter-spacing:.3em}}.ccard .rule{{margin:{round(22 * u)}px auto 0}}",
        "board": f".ccard{{background:var(--surface);border:{round(12 * u)}px solid #6b4a2c;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.7)}}.ccard .rule{{background:var(--accent);opacity:.8;height:{max(3, round(4 * u))}px;border-radius:3px}}",
        "terminal": f".ccard{{background:var(--surface);border:1px solid color-mix(in srgb,var(--accent) 50%,transparent);border-radius:{round(10 * u)}px;font-family:var(--font-mono)}}.ccard .num::before{{content:'$ ';color:var(--ok)}}.ccard .ttl{{font-family:var(--font-mono);font-size:{round(64 * u)}px}}",
        "hud": f".ccard{{background:var(--bg);border:{round(8 * u)}px solid #fff;border-radius:0;box-shadow:{round(10 * u)}px {round(10 * u)}px 0 #000}}.ccard .num{{font-family:var(--font-display);font-size:{round(22 * u)}px}}.ccard .ttl{{font-size:{round(56 * u)}px}}",
        "broadcast": f".ccard{{background:var(--accent);color:#111;border-radius:0;transform:skewX(-6deg)}}.ccard .num{{color:#111}}.ccard .ttl{{color:#111}}.ccard .rule{{background:#111}}",
        "record": f".ccard{{background:var(--surface);color:var(--bg);border-radius:{round(6 * u)}px;box-shadow:0 20px 50px rgba(0,0,0,.6)}}.ccard .ttl{{color:#16181b}}.ccard .num{{color:var(--accent)}}.ccard .rule{{background:var(--accent)}}",
        "editorial": f".ccard{{background:transparent}}.ccard .ttl{{font-size:{round(104 * u)}px;text-transform:uppercase}}.ccard .num{{font:italic 400 {round(40 * u)}px var(--font-serif);letter-spacing:0;text-transform:none;color:var(--muted)}}",
        "neon": f".ccard{{background:rgba(0,0,0,.55);border:3px solid var(--accent);border-radius:{round(22 * u)}px;box-shadow:0 0 30px var(--accent),inset 0 0 24px color-mix(in srgb,var(--accent) 40%,transparent)}}.ccard .ttl{{text-shadow:0 0 18px var(--accent)}}",
        "app": f".ccard{{background:#fff;color:#111;border-radius:{round(28 * u)}px;box-shadow:0 24px 60px rgba(0,0,0,.35)}}.ccard .ttl{{color:#111}}",
    }
    lower = {
        "bar": f".lt{{background:color-mix(in srgb,var(--bg) 88%,transparent);border-left:{round(8 * u)}px solid var(--accent);padding:{round(16 * u)}px {round(28 * u)}px;border-radius:0 {round(10 * u)}px {round(10 * u)}px 0}}",
        "plate": f".lt{{background:rgba(0,0,0,.62);padding:{round(16 * u)}px {round(28 * u)}px;border-top:{max(2, round(3 * u))}px solid var(--accent)}}",
        "terminal": f".lt{{background:var(--surface);font-family:var(--font-mono);padding:{round(14 * u)}px {round(24 * u)}px;border-radius:{round(8 * u)}px;border:1px solid var(--accent)}}.lt .n{{font-family:var(--font-mono);font-size:{round(40 * u)}px}}",
        "chalk": f".lt{{padding:{round(10 * u)}px {round(20 * u)}px;border-bottom:{max(2, round(4 * u))}px dashed var(--accent)}}.lt .n{{font-size:{round(60 * u)}px}}",
        "hud": f".lt{{background:var(--bg);border:{round(6 * u)}px solid #fff;padding:{round(12 * u)}px {round(20 * u)}px;box-shadow:{round(8 * u)}px {round(8 * u)}px 0 #000}}",
        "record": f".lt{{background:var(--surface);padding:{round(14 * u)}px {round(26 * u)}px;border-radius:{round(4 * u)}px}}.lt .n{{color:#16181b}}.lt .r{{color:#4f545a}}",
        "tag": f".lt{{background:var(--accent);padding:{round(14 * u)}px {round(26 * u)}px;border-radius:{round(14 * u)}px}}.lt .n{{color:#111}}.lt .r{{color:#222}}",
    }
    return common + kinds.get(kind, kinds["slate"]) + lower.get(pack["lower_third"], lower["bar"])


BASE_JS = r"""
const tl=gsap.timeline({paused:true});
const K=window.K;
const S=(s,v,t)=>tl.set(s,v,t);
const TO=(s,v,t)=>tl.to(s,v,t);
const FT=(s,a,b,t)=>tl.fromTo(s,a,Object.assign({immediateRender:false},b),t);
function flash(t,p,d){FT('#flash',{opacity:p},{opacity:0,duration:d||.25,ease:'power2.out'},t);}
function enter(sel,t,kind,d){d=d||.5;S(sel,{visibility:'visible'},t);
  if(kind==='fade'){FT(sel,{opacity:0},{opacity:1,duration:d,ease:'sine.out'},t);return;}
  if(kind==='wipe'||kind==='chalk'){FT(sel,{opacity:1,clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:d,ease:kind==='chalk'?'power2.out':'power3.inOut'},t);return;}
  if(kind==='iris'){FT(sel,{opacity:1,clipPath:'circle(0% at 50% 50%)'},{clipPath:'circle(75% at 50% 50%)',duration:d,ease:'power3.out'},t);return;}
  if(kind==='flash'){flash(t,.55,.3);FT(sel,{opacity:0,scale:1.12},{opacity:1,scale:1,duration:Math.min(d,.3),ease:'power4.out'},t);return;}
  if(kind==='glitch'){FT(sel,{opacity:0,x:-30},{opacity:1,x:0,duration:.18,ease:'steps(4)'},t);FT(sel,{filter:'hue-rotate(90deg)'},{filter:'hue-rotate(0deg)',duration:.25},t);return;}
  if(kind==='page'){FT(sel,{opacity:0,rotationY:-35,transformPerspective:1400},{opacity:1,rotationY:0,duration:d,ease:'power3.out'},t);return;}
  if(kind==='cut'){S(sel,{opacity:1},t);return;}
  FT(sel,{opacity:0,x:60},{opacity:1,x:0,duration:d,ease:'expo.out'},t);}
function leave(sel,t,kind,d){d=Math.min(d||.4,.5);
  if(kind==='cut'){S(sel,{opacity:0,visibility:'hidden'},t);return;}
  if(kind==='wipe'||kind==='chalk'){TO(sel,{clipPath:'inset(0 0 0 100%)',duration:d,ease:'power3.in'},t);}
  else{TO(sel,{opacity:0,duration:d,ease:'power2.in'},t);}
  S(sel,{visibility:'hidden'},t+d+.001);}
"""


# ---------------------------------------------------------------- build

def build(work, *, lower_thirds=(), set_pieces=(), callouts=None, layouts=None, track=None, intro=None, cta=None,
          title=None, allowed_numbers=(), fmt=None, out_dir=None, music=None, extra_css="", extra_js=""):
    """Write the long-form composition and plan.json. Returns the plan.

    lower_thirds: [{"start", "duration", "title", "role"}] (out times = voice timeline)
    set_pieces: [{"kind": "title"|"concept_map"|"checklist"|"callout"|"custom", "start", "end", ...}] (see long-form.md)
    callouts: None = automatic retention plan (keyword chips at the kind's cadence); [] = none; or [{"t", "word"}]
    layouts: None = layouts.json in the work dir (or a single "pip"); or [{"start", "layout", "zoom"?}]
    track: music for the intro/outro (and the bed when the pack asks for one): "music:<id>" or a file
    fmt / out_dir: render another format into another folder (previews in 1:1, 4:5...) without touching the main one
    """
    work = Path(work)
    cfg = load_config(work)
    fmt = fm.get(fmt or cfg.get("format", "16:9"))
    pack = sp.get(cfg.get("style", "creative"), cfg.get("style_overrides"))
    brand = rk.load_brand(work)
    words_l = lang_words(brand)
    out_dir = out_dir or os.environ.get("HEDITOR_LONG_OUT")
    out = Path(out_dir) if out_dir else work
    comp = out / "composition"
    comp.mkdir(parents=True, exist_ok=True)
    assets = work / "composition/assets"
    rk.setup_assets(work)
    if out != work:
        (comp / "assets").mkdir(parents=True, exist_ok=True)
        for p in assets.iterdir():
            dst = comp / "assets" / p.name
            if p.is_file() and not dst.exists():
                try:
                    os.link(p, dst)
                except OSError:
                    shutil.copy2(p, dst)
    edl = json.loads((work / "edl.json").read_text())
    voice_dur = round(edl["voice_duration"], 3)
    words_path = work / "words-reviewed.json" if (work / "words-reviewed.json").exists() else work / "words.json"
    words = rk.load_words(words_path, censor=cfg.get("censor"))
    chapters = json.loads((work / "chapters.json").read_text()) if (work / "chapters.json").exists() else [
        {"start": 0.0, "title": title or cfg.get("title", "")}]
    intro = dict(cfg.get("intro", {}), **(intro or {}))
    cta = dict(cfg.get("cta", {}), **(cta or {}))
    off = float(intro.get("duration", 0.0)) if intro.get("title") else 0.0
    cta_kind = cta.get("kind", "follow")
    cta_dur = float(cta.get("duration", 10.0 if cta_kind == "youtube" else 5.0))
    duration = round(off + voice_dur + cta_dur, 3)
    voice_end = round(off + voice_dur, 3)
    if layouts is None:
        lp = work / "layouts.json"
        layouts = json.loads(lp.read_text()) if lp.exists() else [{"start": 0.0, "layout": "pip"}]
    layouts = sorted(layouts, key=lambda x: x["start"])
    for p in set_pieces:
        if p["kind"] == "callout":
            prev = [x for x in layouts if x["start"] <= p["end"]]
            back = dict(prev[-1]) if prev else {"layout": "pip"}
            layouts = [x for x in layouts if not (p["start"] <= x["start"] <= p["end"])]
            layouts += [{"start": p["start"], "layout": p.get("layout", "screen"), "zoom": p["region"]},
                        dict(back, start=p["end"])]
            layouts.sort(key=lambda x: x["start"])
    has_screen = (assets / "screen.mp4").exists()
    has_camera = (assets / "camera.mp4").exists()
    if not has_screen:
        layouts = [dict(x, layout="speaker") for x in layouts]
    cam_file = graded_camera(work, pack) or "camera.mp4"
    scr_size = probe_size(assets / "screen.mp4") if has_screen else None
    cam_size = probe_size(assets / cam_file) if has_camera else None
    focus = tuple(cfg.get("camera_focus") or (_cached_focus(work, assets / "camera.mp4") if has_camera else (0.5, 0.42)))
    cfg["camera_focus"] = [round(focus[0], 3), round(focus[1], 3)]
    T = Timeline()
    tr = pack["transition"]
    shape = pack["frame"]["camera_shape"]
    keys = {"voice_offset": off, "voice_end": voice_end, "duration": duration}

    # ---- boxes: layout states
    def state(name, zoom=None):
        lay = fmt.layout(name)
        st = {}
        scr, cam = lay["screen"], cam_box(lay["camera"], shape)
        if has_screen:
            if scr is not None:
                st["#scr"] = dict(scr.as_dict(), opacity=1)
                st["#scr .inner"] = inner(scr, scr_size, zoom=zoom)
            else:
                st["#scr"] = {"opacity": 0}
        if has_camera:
            if cam is not None:
                st["#cam"] = dict(cam.as_dict(), opacity=1)
                st["#cam .inner"] = inner(cam, cam_size, focus=focus)
            else:
                small = cam_box(fmt.layout("pip")["camera"], shape)
                st["#cam"] = dict(small.as_dict(), opacity=0)
                st["#cam .inner"] = inner(small, cam_size, focus=focus)
        cap = lay["captions"]
        st["#caps"] = cap.as_dict()
        return {k: ({"left": v["x"], "top": v["y"], "width": v["w"], "height": v["h"], "opacity": v.get("opacity", 1)}
                    if "w" in v else v) for k, v in st.items()}

    def apply_state(t, st, dur):
        for sel, v in st.items():
            if dur <= 0.02:
                T.js(t, f"S({_j(sel)},{_j(v)},{t:.4f});")
            else:
                T.js(t, f"TO({_j(sel)},Object.assign({_j(v)},{{duration:{dur},ease:{_j(tr['ease'])}}}),{t:.4f});")

    first = state(layouts[0]["layout"], layouts[0].get("zoom"))
    init = {k: dict(v) for k, v in first.items()}
    for k in ("#scr", "#cam"):
        if k in init:
            init[k]["opacity"] = 0 if off > 0 else init[k].get("opacity", 1)
    T.js(0, "".join(f"gsap.set({_j(k)},{_j(v)});" for k, v in init.items()))
    if off > 0:
        for k in ("#scr", "#cam"):
            if k in first and first[k].get("opacity", 1):
                T.js(off, f"FT({_j(k)},{{opacity:0}},{{opacity:1,duration:.5,ease:'sine.out'}},{off - 0.25:.4f});")
    layout_log = []
    letterbox = pack["overlay"].get("letterbox")
    for i, lay in enumerate(layouts):
        t = off + lay["start"]
        if i:
            apply_state(t, state(lay["layout"], lay.get("zoom")), tr["dur"] if tr["kind"] != "cut" else 0)
            T.sfx(t - 0.05, pack["sfx"]["transition"], -24, f"layout {lay['layout']}")
        if letterbox:
            on = lay["layout"] == "speaker"
            T.js(t, f"TO('#lb-t',{{y:{fmt.height * .12 if on else 0:.0f},duration:.6,ease:'power2.inOut'}},{t:.4f});"
                    f"TO('#lb-b',{{y:{-fmt.height * .12 if on else 0:.0f},duration:.6,ease:'power2.inOut'}},{t:.4f});")
        layout_log.append({"start": round(t, 3), "layout": lay["layout"], "zoom": lay.get("zoom")})
    # hide boxes in the CTA
    for k in ("#scr", "#cam"):
        T.js(voice_end, f"TO({_j(k)},{{opacity:0,duration:.4}},{voice_end + 0.05:.4f});")

    # ---- intro card
    if off > 0:
        logo = '<img class="logo" src="assets/logo.png" alt="">' if (assets / "logo.png").exists() else ""
        T.el(0, off, f'<div id="intro" class="card full">{logo}<div class="kick">{html.escape(intro.get("kicker", brand["name"]))}</div>'
                     f'<div class="big">{html.escape(intro["title"])}</div>'
                     + (f'<div class="sub">{html.escape(intro["subtitle"])}</div>' if intro.get("subtitle") else "") + "</div>")
        T.js(0, "S('#intro',{visibility:'visible',opacity:1},0);FT('#intro .big',{y:40,opacity:0},{y:0,opacity:1,duration:.7,ease:'expo.out'},.15);"
                "FT('#intro .sub',{y:20,opacity:0},{y:0,opacity:1,duration:.6},.45);")
        T.js(off, f"leave('#intro',{off - 0.35:.4f},{_j(tr['kind'] if tr['kind'] != 'cut' else 'fade')},.4);")
        T.sfx(0.0, pack["sfx"]["intro"], -14, "intro")
        if letterbox:
            T.js(0, f"gsap.set('#lb-t',{{y:{fmt.height * .12:.0f}}});gsap.set('#lb-b',{{y:{-fmt.height * .12:.0f}}});")
            if layouts[0]["layout"] != "speaker":
                T.js(off, f"TO('#lb-t',{{y:0,duration:.6}},{off - 0.2:.4f});TO('#lb-b',{{y:0,duration:.6}},{off - 0.2:.4f});")

    # ---- chapter cards and tags
    allowed = set(str(x) for x in allowed_numbers)
    for k, ch in enumerate(chapters):
        t = off + ch["start"]
        cid = f"ch{k}"
        num = f"{words_l['chapter']} {k + 1}"
        allowed.add(str(k + 1))
        T.el(t, t + CARD_S, f'<div id="{cid}" class="card ccard"><div class="num">{num}</div>'
                            f'<div class="ttl">{html.escape(ch["title"])}</div><div class="rule"></div></div>')
        T.el(t, t + 12, f'<div id="{cid}-tag" class="ctag"><b>{k + 1}</b>{html.escape(ch["title"])}</div>')
        show_card = k > 0 or off == 0
        if show_card:
            t_in = t if k else max(0.0, t)
            T.js(t_in, f"FT('#dim',{{opacity:0}},{{opacity:1,duration:.35}},{t_in:.4f});enter('#{cid}',{t_in:.4f},{_j(tr['kind'])},{tr['dur']});"
                       f"FT('#{cid} .rule',{{width:0}},{{width:'38%',duration:.8,ease:'power3.out'}},{t_in + 0.25:.4f});"
                       f"leave('#{cid}',{t_in + CARD_S - 0.4:.4f},{_j(tr['kind'])},.4);TO('#dim',{{opacity:0,duration:.4}},{t_in + CARD_S - 0.4:.4f});")
            T.sfx(t_in - 0.05, pack["sfx"]["chapter"], -16, f"chapter {k + 1}")
        tag_t = t + (CARD_S if show_card else 0.3)
        T.js(tag_t, f"FT('#{cid}-tag',{{opacity:0,x:-20}},{{opacity:1,x:0,duration:.4,ease:'power3.out'}},{tag_t:.4f});"
                    f"TO('#{cid}-tag',{{opacity:0,duration:.5}},{tag_t + 7:.4f});")
        keys[f"chapter{k}"] = round(t, 3)

    # ---- lower thirds
    for i, lt in enumerate(lower_thirds):
        t = off + lt["start"]
        d = lt.get("duration", LOWER_S)
        r = fmt.lower_third
        T.el(t, t + d, f'<div id="lt{i}" class="lt" style="left:{r.x}px;top:{r.y}px;max-width:{r.w}px">'
                       f'<div class="n">{html.escape(lt["title"])}</div>'
                       + (f'<div class="r">{html.escape(lt["role"])}</div>' if lt.get("role") else "") + "</div>")
        T.js(t, f"FT('#lt{i}',{{opacity:0,x:-80}},{{opacity:1,x:0,duration:.5,ease:'expo.out'}},{t:.4f});"
                f"TO('#lt{i}',{{opacity:0,x:-40,duration:.35,ease:'power2.in'}},{t + d - 0.35:.4f});")
        T.sfx(t - 0.05, pack["sfx"]["lower_third"], -20, f"lower third {i}")
        keys[f"lower{i}"] = round(t, 3)

    # ---- set pieces
    avoid = []
    for i, piece in enumerate(set_pieces):
        _set_piece(T, i, piece, off, fmt, pack, words, keys, scr_size)
        avoid.append((off + piece["start"] - 1.0, off + piece["end"] + 1.0))

    # ---- retention callouts (keyword chips)
    if callouts is None:
        stop = {lf.norm(x) for x in cfg.get("callout_stopwords", [])}
        callouts = lf.retention_plan(words, 0.0, voice_dur, cfg.get("kind", "aula"),
                                     avoid=[(a - off, b - off) for a, b in avoid], stop=stop)
    for i, c in enumerate(callouts):
        t = off + c["t"]
        word = c["word"]
        T.el(t, t + CALLOUT_S, f'<div id="co{i}" class="chip" style="right:{fmt.width - fmt.safe.right}px;top:{fmt.safe.y + 10}px">{html.escape(word)}</div>')
        T.js(t, f"FT('#co{i}',{{opacity:0,y:-24,scale:.8}},{{opacity:1,y:0,scale:1,duration:.3,ease:'back.out(2.4)'}},{t - 0.04:.4f});"
                f"TO('#co{i}',{{opacity:0,y:-12,duration:.3}},{t + CALLOUT_S - 0.3:.4f});")
        if c.get("punch", i % 2 == 1):
            T.js(t, f"TO('#world',{{scale:1.035,duration:.25,ease:'power3.out'}},{t - 0.05:.4f});TO('#world',{{scale:1,duration:.6,ease:'power2.inOut'}},{t + 1.4:.4f});")
        T.sfx(t - 0.03, pack["sfx"]["callout"], -24, f"callout {word}")
        keys[f"callout{i}"] = round(t, 3)

    # ---- captions
    caps = []
    if cfg.get("captions", {}).get("burn", True):
        caps = _captions(T, words, fmt, pack, off, voice_dur)

    # ---- CTA
    _cta(T, cta_kind, voice_end, duration, fmt, pack, brand, words_l)
    T.sfx(voice_end + 0.1, pack["sfx"]["transition"], -16, "to CTA")

    # ---- page
    cfg_page = {"fmt": fmt, "pack": pack, "brand": brand, "duration": duration, "off": off, "voice_dur": voice_dur,
                "has_screen": has_screen, "has_camera": has_camera, "scr_size": scr_size, "cam_size": cam_size,
                "cam_file": cam_file, "extra_css": extra_css, "extra_js": extra_js, "keys": keys}
    (comp / "index.html").write_text(write_page(T, cfg_page, 0.0, duration))
    if not (comp / "package.json").exists():
        tpl = Path(__file__).resolve().parents[2] / "templates/composition-package.json"
        shutil.copy2(tpl, comp / "package.json")
    render_cfg = cfg.get("render", {})
    segs = lf.plan_segments(duration, fps=cfg.get("fps", 30), max_len=render_cfg.get("segment_max_s", 60),
                            cut_points=[off + c["start"] for c in chapters] + [voice_end], avoid=avoid)
    plan = {
        "mode": "long", "format": fmt.key, "style": pack["slug"], "kind": cfg.get("kind", "aula"), "fps": cfg.get("fps", 30),
        "duration": duration, "voice_offset": off, "voice_end": voice_end, "voice_duration": voice_dur,
        "keys": {k: v for k, v in keys.items() if isinstance(v, (int, float))},
        "captions": caps, "chapters": [dict(c, start_timeline=round(off + c["start"], 3)) for c in chapters],
        "layouts": layout_log, "lower_thirds": list(lower_thirds), "set_pieces": [{k: v for k, v in p.items() if k not in ("html", "css", "js")} for p in set_pieces],
        "callouts": callouts, "cta": {"kind": cta_kind, "duration": cta_dur}, "segments": segs,
        "sound_events": sorted(T.sounds, key=lambda e: e["time"]),
        "music": music if music is not None else _music_plan(pack, track, off, voice_end, duration, cfg),
        "allowed_numbers": sorted(allowed), "loudness": cfg.get("loudness", {"lufs": -14.0, "true_peak": -1.0}),
        "camera_focus": cfg["camera_focus"], "camera_file": cam_file,
    }
    (out / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    (out / "captions.json").write_text(json.dumps(caps, ensure_ascii=False, indent=1))
    if out == work:
        write_segments(work, T, cfg_page, segs, assets)
    return plan


def _captions(T, words, fmt, pack, off, voice_dur):
    c = pack["captions"]
    px = round(fmt.caption_px * c.get("scale", 1.0))
    family = pack["fonts"]["caption"]
    upper = c["case"] == "upper"
    prefix = c.get("prefix", "")
    groups = lf.cue_groups(words, max_chars=fmt.caption_chars, max_lines=fmt.caption_lines, max_dur=5.5)
    max_w = fmt.caption.w - 40
    on = {"color": c["active_fg"], "backgroundColor": c["active_bg"] or "rgba(0,0,0,0)"}
    if c.get("underline"):
        on["boxShadow"] = f"inset 0 -0.09em 0 {c['underline']}"
    off_v = {"color": c["fg"], "backgroundColor": "rgba(0,0,0,0)", "boxShadow": "none"}
    out = []
    for g in groups:
        lines = g["lines"]
        size = fit_px([prefix + ln for ln in lines], family, px, c["weight"], max_w, upper)
        k = 0
        rows = []
        for ln in lines:
            n = len(ln.split())
            spans = " ".join(f'<span id="{g["id"]}-w{k + j}" class="w">{html.escape(w.get("shown", w["word"]))}</span>'
                             for j, w in enumerate(g["words"][k:k + n]))
            rows.append(f'<div class="ln">{html.escape(prefix)}{spans}</div>')
            k += n
        t0, t1 = off + g["start"], off + min(g["end"], voice_dur)
        T.el(t0, t1, f'<div id="{g["id"]}" class="lcap" style="font-size:{size}px">{"".join(rows)}</div>', cap=True)
        js = [f"S('#{g['id']}',{{visibility:'visible'}},{t0:.4f});"]
        for j, w in enumerate(g["words"]):
            ta = max(t0, off + w["start"] - 0.02)
            js.append(f"S('#{g['id']}-w{j}',{_j(on)},{ta:.4f});")
            if j + 1 < len(g["words"]):
                tb = off + g["words"][j + 1]["start"] - 0.02
                if tb > ta:
                    js.append(f"S('#{g['id']}-w{j}',{_j(off_v)},{tb:.4f});")
        js.append(f"S('#{g['id']}',{{visibility:'hidden'}},{t1:.4f});")
        T.js(t0, "".join(js), t1=t1, cap=True)
        out.append({"id": g["id"], "start": g["start"], "end": g["end"], "text": g["text"],
                    "words": [{"word": w["word"], "shown": w.get("shown", w["word"]), "start": w["start"], "end": w["end"]} for w in g["words"]]})
    return out


def _cta(T, kind, t, duration, fmt, pack, brand, words_l):
    u = min(fmt.width, fmt.height) / 1080
    logo = '<img class="logo" src="assets/logo.png" alt="">'
    pointer = rk.icon("pointer") if (rk.ICON_SRC / "pointer.svg").exists() else ""
    check = rk.icon("check") if (rk.ICON_SRC / "check.svg").exists() else ""
    bell = rk.icon("bell-ring") if (rk.ICON_SRC / "bell-ring.svg").exists() else ""
    if kind == "youtube":
        sub, subd = brand.get("subscribe", "Subscribe"), brand.get("subscribed", "Subscribed")
        body = (f'{logo}<div class="handle">{html.escape(brand["handle"])}</div>'
                f'<div class="cta-row"><div id="cbtn" class="btn"><span class="b1">{html.escape(sub)}</span>'
                f'<span class="b2">{check}{html.escape(subd)}{bell}</span></div></div>'
                f'<div class="slots"><div class="slot">{html.escape(brand.get("watch_next", words_l["next"]))}</div>'
                f'<div class="slot">{html.escape(brand.get("watch_next", words_l["next"]))}</div></div>')
    else:
        body = (f'{logo}<div class="handle">{html.escape(brand["handle"])}</div>'
                f'<div class="cta-row"><div id="cbtn" class="btn follow"><span class="b1">{html.escape(brand["follow"])}</span>'
                f'<span class="b2">{check}{html.escape(brand["following"])}</span></div></div>')
    T.el(t, duration, f'<div id="outro" class="card full">{body}</div><div id="finger">{pointer}</div>')
    bx, by = fmt.width / 2 + 60 * u, fmt.height / 2 + 40 * u
    # The end card fades in over the last 0.45 s of speech so it covers the screen/camera boxes before their clips
    # end (a clip that ended leaves an empty black box for the length of its fade-out).
    T.js(t - 0.5, f"S('#outro',{{visibility:'visible'}},{t - 0.45:.4f});FT('#outro',{{opacity:0}},{{opacity:1,duration:.45}},{t - 0.45:.4f});"
            f"FT('#outro .handle',{{y:30,opacity:0}},{{y:0,opacity:1,duration:.4}},{t + 0.3:.4f});"
            f"FT('#cbtn',{{scale:.6,opacity:0}},{{scale:1,opacity:1,duration:.45,ease:'back.out(2)'}},{t + 0.55:.4f});"
            f"S('#finger',{{left:{bx + 260 * u:.0f},top:{by + 260 * u:.0f}}},{t:.4f});"
            f"FT('#finger',{{opacity:0}},{{opacity:1,left:{bx:.0f},top:{by:.0f},duration:.5,ease:'power3.out'}},{t + 1.3:.4f});"
            f"TO('#finger',{{scale:.85,duration:.07}},{t + 1.9:.4f});TO('#finger',{{scale:1,duration:.12}},{t + 1.97:.4f});"
            f"S('#cbtn .b1',{{opacity:0}},{t + 1.95:.4f});S('#cbtn .b2',{{opacity:1}},{t + 1.95:.4f});"
            f"TO('#cbtn',{{backgroundColor:'#3a3f47',color:'#ffffff',duration:.2}},{t + 1.95:.4f});"
            f"TO('#finger',{{opacity:0,duration:.3}},{t + 2.6:.4f});"
            + (f"FT('.slot',{{opacity:0,y:30}},{{opacity:1,y:0,duration:.4,stagger:.15}},{t + 2.4:.4f});" if kind == "youtube" else ""))
    T.sfx(t + 1.92, pack["sfx"]["cta_tap"], -12, "CTA tap")
    T.sfx(t + 2.0, pack["sfx"]["cta_done"], -16, "CTA done")


def _music_plan(pack, track, off, voice_end, duration, cfg):
    if not track:
        return []
    if str(track).startswith("music:"):
        track = rk.music_path(track)
    secs = []
    if off > 0:
        secs.append({"start": 0.0, "end": off + 0.6, "mode": "full", "gain_db": 0, "track": track, "src": 0.0, "fade_out": 0.8})
    if pack["music"].get("bed") or cfg.get("music_bed"):
        secs.append({"start": off + 0.6, "end": voice_end, "mode": "lowpass", "gain_db": -10, "track": track,
                     "src": off + 0.6, "loop": True, "fade_in": 1.5, "fade_out": 1.0})
    secs.append({"start": voice_end - 0.2, "end": duration, "mode": "full", "gain_db": 2, "track": track,
                 "src": cfg.get("music_outro_src", 20.0), "fade_in": 0.4, "fade_out": 1.2})
    return secs


# ---------------------------------------------------------------- set pieces

def _set_piece(T, i, p, off, fmt, pack, words, keys, scr_size=None):
    kind = p["kind"]
    t0, t1 = off + p["start"], off + p["end"]
    sid = f"sp{i}"
    u = min(fmt.width, fmt.height) / 1080
    keys[f"setpiece{i}"] = round(t0, 3)
    T.sfx(t0 - 0.05, pack["sfx"]["set_piece"], -15, f"set piece {kind}")
    if kind == "title":
        ws = [w for w in words if p["start"] - 0.01 <= w["start"] < p["end"]]
        emph = {lf.norm(x) for x in p.get("emphasis", [])}
        spans = " ".join(f'<span id="{sid}-w{j}" class="sw{" em" if lf.norm(w["word"]) in emph else ""}">{html.escape(w["shown"])}</span>'
                         for j, w in enumerate(ws))
        T.el(t0, t1, f'<div id="{sid}" class="card sp-title" style="left:{fmt.safe.x}px;top:{fmt.safe.y}px;width:{fmt.safe.w}px;height:{fmt.safe.h}px">'
                     f'<div class="sp-in">{spans}</div></div>')
        js = [f"FT('#dim',{{opacity:0}},{{opacity:1,duration:.3}},{t0 - 0.1:.4f});S('#{sid}',{{visibility:'visible',opacity:1}},{t0 - 0.05:.4f});"
              f"TO('#caps',{{opacity:0,duration:.15}},{t0 - 0.1:.4f});"]  # the giant words carry the caption
        for j, w in enumerate(ws):
            ta = off + w["start"] - 0.03
            js.append(f"FT('#{sid}-w{j}',{{opacity:0,y:30,scale:.7}},{{opacity:1,y:0,scale:1,duration:.22,ease:'back.out(2.6)'}},{ta:.4f});")
        js.append(f"leave('#{sid}',{t1:.4f},'fade',.35);TO('#dim',{{opacity:0,duration:.35}},{t1:.4f});"
                  f"TO('#caps',{{opacity:1,duration:.2}},{t1:.4f});")
        T.js(t0, "".join(js), t1=t1)
        _css_once(T, "title", f".sp-title{{display:flex;align-items:center;justify-content:center;text-align:center;z-index:31}}"
                              f".sp-in{{font-family:var(--font-display);font-size:{round(96 * u)}px;line-height:1.08;color:var(--text);text-wrap:balance;"
                              f"{'text-transform:uppercase;' if pack['captions']['case'] == 'upper' else ''}}}"
                              f".sp-in .sw{{display:inline-block;margin:0 .12em;opacity:0}}.sp-in .em{{color:var(--accent)}}")
    elif kind == "concept_map":
        # nodes: [{"id", "label", "t", "x", "y"}] (x/y fractions of the safe area); edges: [{"from", "to", "t", "label"?}]
        area = fmt.safe
        nodes = {n["id"]: n for n in p["nodes"]}
        nw, nh = round(p.get("node_w", 300) * u), round(p.get("node_h", 96) * u)
        svg, divs, js = [], [], [f"S('#{sid}',{{visibility:'visible',opacity:1}},{t0:.4f});FT('#{sid} .sp-bg',{{opacity:0}},{{opacity:1,duration:.4}},{t0:.4f});"]
        if p.get("heading"):
            divs.append(f'<div class="sp-head" style="left:{area.x}px;top:{area.y}px;width:{area.w}px">{html.escape(p["heading"])}</div>')
            js.append(f"FT('#{sid} .sp-head',{{opacity:0,y:-20}},{{opacity:1,y:0,duration:.4}},{t0 + 0.1:.4f});")
        for e_i, e in enumerate(p.get("edges", [])):
            a, b = nodes[e["from"]], nodes[e["to"]]
            x1, y1 = area.x + a["x"] * area.w, area.y + a["y"] * area.h
            x2, y2 = area.x + b["x"] * area.w, area.y + b["y"] * area.h
            ang = math.atan2(y2 - y1, x2 - x1)
            pad = min(nw / 2 / max(abs(math.cos(ang)), 1e-3), nh / 2 / max(abs(math.sin(ang)), 1e-3)) + 10 * u
            x1, y1, x2, y2 = x1 + math.cos(ang) * pad, y1 + math.sin(ang) * pad, x2 - math.cos(ang) * pad, y2 - math.sin(ang) * pad
            L = math.hypot(x2 - x1, y2 - y1)
            svg.append(f'<path id="{sid}-e{e_i}" d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="var(--accent)" stroke-width="{max(3, round(5 * u))}" '
                       f'fill="none" stroke-linecap="round" marker-end="url(#{sid}-arr)" style="stroke-dasharray:{L:.1f} {L + 4:.1f};stroke-dashoffset:{L:.1f};opacity:0"/>')
            # an arrow never lands on empty space: it finishes drawing when its target node appears
            te = off + max(e["t"], b["t"] - 0.45, a["t"]) - 0.05
            js.append(f"S('#{sid}-e{e_i}',{{opacity:1}},{te:.4f});FT('#{sid}-e{e_i}',{{strokeDashoffset:{L:.1f}}},{{strokeDashoffset:0,duration:.5,ease:'power2.inOut'}},{te:.4f});")
            if e.get("label"):
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                divs.append(f'<div id="{sid}-el{e_i}" class="sp-elab" style="left:{mx - 200 * u:.0f}px;top:{my - 44 * u:.0f}px;width:{400 * u:.0f}px">{html.escape(e["label"])}</div>')
                js.append(f"FT('#{sid}-el{e_i}',{{opacity:0}},{{opacity:1,duration:.3}},{te + 0.35:.4f});")
        for n in p["nodes"]:
            cx, cy = area.x + n["x"] * area.w, area.y + n["y"] * area.h
            divs.append(f'<div id="{sid}-{n["id"]}" class="sp-node{" hot" if n.get("hot") else ""}" style="left:{cx - nw / 2:.0f}px;top:{cy - nh / 2:.0f}px;width:{nw}px;height:{nh}px">'
                        f'{html.escape(n["label"])}</div>')
            tn = off + n["t"] - 0.05
            js.append(f"FT('#{sid}-{n['id']}',{{opacity:0,scale:.6}},{{opacity:1,scale:1,duration:.32,ease:'back.out(2.2)'}},{tn:.4f});")
            T.sfx(tn, pack["sfx"]["callout"], -22, f"node {n['label']}")
        js.append(f"leave('#{sid}',{t1:.4f},'fade',.45);")
        T.el(t0, t1, f'<div id="{sid}" class="card sp-map" style="left:0;top:0;width:{fmt.width}px;height:{fmt.height}px"><div class="sp-bg"></div>'
                     f'<svg width="{fmt.width}" height="{fmt.height}" style="position:absolute;left:0;top:0"><defs><marker id="{sid}-arr" viewBox="0 0 10 10" refX="8" refY="5" '
                     f'markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/></marker></defs>{"".join(svg)}</svg>{"".join(divs)}</div>')
        T.js(t0, "".join(js), t1=t1)
        _css_once(T, "map", f".sp-map{{z-index:28}}.sp-map .sp-bg{{position:absolute;inset:0;background:var(--bg)}}"
                            f".sp-node{{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 {round(14 * u)}px;"
                            f"font:700 {round(34 * u)}px var(--font-body);color:var(--text);background:var(--surface);border:{max(2, round(3 * u))}px solid var(--accent2);"
                            f"border-radius:{round(16 * u)}px;opacity:0;box-shadow:0 12px 30px rgba(0,0,0,.4);line-height:1.1}}"
                            f".sp-node.hot{{border-color:var(--accent);color:var(--accent)}}"
                            f".sp-elab{{position:absolute;text-align:center;font:600 {round(26 * u)}px var(--font-body);color:var(--muted);opacity:0}}"
                            f".sp-head{{position:absolute;text-align:center;font-family:var(--font-display);font-size:{round(54 * u)}px;color:var(--accent);opacity:0}}")
    elif kind == "checklist":
        area = fmt.safe
        items = "".join(f'<li id="{sid}-i{j}"><span class="bx"></span>{html.escape(it["text"])}</li>' for j, it in enumerate(p["items"]))
        T.el(t0, t1, f'<div id="{sid}" class="card sp-list" style="left:{area.x + area.w * .06:.0f}px;top:{area.y + area.h * .1:.0f}px;width:{area.w * (.52 if not fmt.vertical else .88):.0f}px">'
                     f'<div class="hd">{html.escape(p.get("heading", ""))}</div><ul>{items}</ul></div>')
        js = [f"FT('#dimw',{{opacity:0}},{{opacity:1,duration:.3}},{t0:.4f});enter('#{sid}',{t0:.4f},{_j(pack['transition']['kind'])},.5);"]
        for j, it in enumerate(p["items"]):
            ti = off + it["t"] - 0.05
            js.append(f"FT('#{sid}-i{j}',{{opacity:.42}},{{opacity:1,duration:.25}},{ti:.4f});S('#{sid}-i{j} .bx',{{backgroundColor:'var(--accent)'}},{ti:.4f});")
            T.sfx(ti, "pop", -22, f"check {j}")
        js.append(f"leave('#{sid}',{t1:.4f},'fade',.4);TO('#dimw',{{opacity:0,duration:.4}},{t1:.4f});")
        T.js(t0, "".join(js), t1=t1)
        _css_once(T, "list", f".sp-list{{z-index:31;background:color-mix(in srgb,var(--bg) 92%,transparent);border:2px solid var(--accent);border-radius:{round(18 * u)}px;padding:{round(34 * u)}px {round(44 * u)}px}}"
                             f".sp-list .hd{{font-family:var(--font-display);font-size:{round(56 * u)}px;color:var(--accent);margin-bottom:{round(16 * u)}px}}"
                             f".sp-list ul{{list-style:none}}.sp-list li{{font:600 {round(38 * u)}px var(--font-body);color:var(--text);margin:{round(14 * u)}px 0;opacity:.42;display:flex;gap:{round(18 * u)}px;align-items:center}}"
                             f".sp-list .bx{{width:{round(28 * u)}px;height:{round(28 * u)}px;border:3px solid var(--accent);border-radius:6px;flex:none}}")
    elif kind == "callout":
        # zoom into a screen region; `highlight` (fractions of the screen, default the middle of the region) gets a
        # frame placed where it lands after the zoom, with the label above it. The layout returns afterwards.
        r = p["region"]
        lay = fmt.layout(p.get("layout", "screen"))
        box = lay["screen"]
        hx, hy, hw, hh = p.get("highlight") or (r[0] + r[2] * .2, r[1] + r[3] * .2, r[2] * .6, r[3] * .6)
        if scr_size:
            z = inner(box, scr_size, zoom=r)
            fx, fy = box.x + z["x"] + hx * scr_size[0] * z["scale"], box.y + z["y"] + hy * scr_size[1] * z["scale"]
            fw, fh = hw * scr_size[0] * z["scale"], hh * scr_size[1] * z["scale"]
        else:
            fx, fy, fw, fh = box.x + box.w * .2, box.y + box.h * .2, box.w * .6, box.h * .6
        pad = 14 * u
        T.el(t0, t1, f'<div id="{sid}" class="card sp-co" style="left:{fx - pad:.0f}px;top:{fy - pad:.0f}px;'
                     f'width:{fw + 2 * pad:.0f}px;height:{fh + 2 * pad:.0f}px"><div class="lab">{html.escape(p.get("label", ""))}</div></div>')
        T.js(t0, f"enter('#{sid}',{t0 + 0.6:.4f},'fade',.3);leave('#{sid}',{t1 - 0.4:.4f},'fade',.3);", t1=t1)
        _css_once(T, "callout", f".sp-co{{z-index:26;border:{max(3, round(5 * u))}px solid var(--accent);border-radius:{round(18 * u)}px;box-shadow:0 0 0 4000px rgba(0,0,0,.35)}}"
                                f".sp-co .lab{{position:absolute;left:0;top:-{round(64 * u)}px;font:800 {round(34 * u)}px var(--font-body);color:var(--bg);background:var(--accent);padding:{round(6 * u)}px {round(16 * u)}px;border-radius:{round(10 * u)}px;white-space:nowrap}}")
    elif kind == "custom":
        T.el(t0, t1, p["html"])
        if p.get("css"):
            _css_once(T, f"custom{i}", p["css"])
        if p.get("js"):
            T.js(t0, p["js"], t1=t1)
    else:
        raise ValueError(f"unknown set piece {kind!r}")


def _css_once(T, key, css):
    T.css.setdefault(key, css)


# ---------------------------------------------------------------- page writer

def write_page(T, c, start, end, media=None):
    """HTML of the window [start, end) (whole page when start=0 and end=duration).

    media: {"screen": file, "camera": file, "start": data-start, "duration": ..} for segment-local video files;
    default = the full assembled assets.
    """
    fmt, pack, brand = c["fmt"], c["pack"], c["brand"]
    ev, el = T.window(start, end)
    fams = {pack["fonts"][k] for k in ("display", "body", "mono", "caption")} | {pack["fonts"].get("serif", "Playfair Display")}
    vids = ""
    off, vd = c["off"], c["voice_dur"]
    v_start = media["start"] if media else off
    v_dur = media["duration"] if media else vd
    v_mstart = media.get("media_start", 0.0) if media else 0.0
    if v_dur > 0:
        if c["has_screen"]:
            sw, sh = c["scr_size"]
            src = media["screen"] if media else "screen.mp4"
            vids += (f'<div id="scr" class="box"><div class="inner"><video id="v-scr" class="clip" data-start="{v_start:.4f}" '
                     + (f'data-media-start="{v_mstart:.4f}" ' if v_mstart else "")
                     + f'data-duration="{v_dur:.4f}" data-track-index="0" src="assets/{src}" style="width:{sw}px;height:{sh}px" muted playsinline></video></div></div>')
        if c["has_camera"]:
            cw, ch = c["cam_size"]
            src = media["camera"] if media else c["cam_file"]
            vids += (f'<div id="cam" class="box"><div class="inner"><video id="v-cam" class="clip" data-start="{v_start:.4f}" '
                     + (f'data-media-start="{v_mstart:.4f}" ' if v_mstart else "")
                     + f'data-duration="{v_dur:.4f}" data-track-index="1" src="assets/{src}" style="width:{cw}px;height:{ch}px" muted playsinline></video></div></div>')
    else:
        vids = '<div id="scr" class="box"></div><div id="cam" class="box"></div>'
    caps_html = "".join(e[2] for e in el if e[3])
    other = [e[2] for e in el if not e[3]]
    cards = "".join(x for x in other if 'class="card' in x or 'id="finger"' in x)
    world_extra = "".join(x for x in other if x not in cards)
    css = (font_faces(fams) + sp.css_vars(pack) + base_css(fmt, pack) + card_css(fmt, pack)
           + "".join(T.css.values()) + c.get("extra_css", ""))
    js_body = "".join(e[2] for e in sorted(ev, key=lambda e: e[0]))
    dur = end - start
    whole = start <= 1e-9 and abs(end - c["duration"]) < 1e-6
    reg = ("window.__timelines=window.__timelines||{};" + ("window.__timelines.main=tl;" if whole else
           f"tl.set({{}},{{}},{c['duration']:.4f});const main=gsap.timeline({{paused:true}});"
           f"main.add(tl.tweenFromTo({start:.4f},{end:.4f},{{ease:'none'}}),0);window.__timelines.main=main;"))
    return f"""<!doctype html><html lang="{brand.get('lang', 'pt')}"><head><meta charset="utf-8"><title>{html.escape(brand['name'])} long-form</title>
<script src="assets/gsap.min.js"></script><style>{css}</style></head><body>
<main id="stage" data-composition-id="main" data-start="0" data-duration="{dur:.4f}" data-width="{fmt.width}" data-height="{fmt.height}" data-fps="30">
<div id="world">{vids}<div id="dimw" class="dim dimw"></div><div id="fx">{world_extra}</div></div>
<div id="caps">{caps_html}</div>
<div id="dim" class="dim"></div>
<div id="cards">{cards}</div>
<div id="lb-t" class="lb"></div><div id="lb-b" class="lb"></div><div id="scan"></div><div id="vig"></div><div id="grain"></div><div id="flash"></div>
</main>
<script>window.K={json.dumps(c['keys'], ensure_ascii=False)};window.SEG={{start:{start:.4f},end:{end:.4f}}};</script>
<script>{BASE_JS}{js_body}{c.get('extra_js', '')}
TO('#grain',{{x:256,y:256,duration:{c['duration']:.3f},ease:'steps({max(1, round(c['duration'] * 12))})'}},0);
{reg}</script>
</body></html>"""


def segment_media(assets, seg_dir, name, a, b, fps_src=None):
    """Frame-accurate cut [a, b) (media seconds) of an asset into the segment's assets (re-encoded, CRF 16)."""
    out = seg_dir / "assets" / name
    meta = out.with_suffix(".json")
    key = f"{(assets / name).stat().st_mtime_ns}:{a:.4f}:{b:.4f}"
    if out.exists() and meta.exists() and meta.read_text() == key:
        return out.name
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.4f}", "-i", str(assets / name), "-t", f"{b - a:.4f}", "-an",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", str(out)], check=True)
    meta.write_text(key)
    return out.name


def write_segments(work, T, c, segs, assets):
    """segments/seg-NNN/{index.html, package.json, assets/} for each render segment (media cut per segment)."""
    root = Path(work) / "segments"
    root.mkdir(exist_ok=True)
    tpl = Path(__file__).resolve().parents[2] / "templates/composition-package.json"
    shared = [p for p in assets.iterdir() if p.is_file() and p.suffix.lower() not in (".mp4", ".wav", ".webm", ".json")]
    index = []
    for s in segs:
        d = root / f"seg-{s['index']:03d}"
        (d / "assets").mkdir(parents=True, exist_ok=True)
        for p in shared:
            dst = d / "assets" / p.name
            if not dst.exists():
                try:
                    os.link(p, dst)
                except OSError:
                    shutil.copy2(p, dst)
        if not (d / "package.json").exists():
            shutil.copy2(tpl, d / "package.json")
        v0, v1 = max(s["start"], c["off"]), min(s["end"], c["off"] + c["voice_dur"])
        media = {"start": 0.0, "duration": 0.0}
        if v1 - v0 >= 2.0 / 30:  # less than ~2 frames of video in this segment: the boxes are fading out anyway
            media = {"start": round(v0 - s["start"], 4), "duration": round(v1 - v0, 4)}
            a, b = v0 - c["off"], v1 - c["off"]
            if c["has_screen"]:
                media["screen"] = segment_media(assets, d, "screen.mp4", a, b)
            if c["has_camera"]:
                media["camera"] = segment_media(assets, d, c["cam_file"], a, b)
        markup = write_page(T, c, s["start"], s["end"], media=media)
        (d / "index.html").write_text(markup)
        digest = hashlib.sha256(markup.encode() + json.dumps(media, sort_keys=True).encode()).hexdigest()[:16]
        index.append(dict(s, dir=str(d.relative_to(work)), hash=digest))
    for old in root.glob("seg-*"):
        if old.name not in {f"seg-{s['index']:03d}" for s in segs}:
            shutil.rmtree(old, ignore_errors=True)
    (root / "index.json").write_text(json.dumps(index, indent=1))
    return index
