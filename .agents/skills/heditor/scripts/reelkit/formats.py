"""Output format profiles shared by every heditor command.

A profile describes one canvas: its size, the safe area for text and key graphics, the first row the top-margin
gate accepts, the default caption zone and the camera/screen layouts available in that canvas. Reels keep the
historical 9:16 numbers (SAFE_TOP 270, caption band 1222-1472), so existing cuts behave exactly as before.

    import formats
    fmt = formats.get("16:9")            # also "landscape", "1920x1080", "16:9-4k", "1:1", "4:5", "9:16"
    fmt.width, fmt.height, fmt.safe, fmt.caption
    fmt.layout("pip")                     # {"screen": Rect, "camera": Rect | None, "captions": Rect}
    formats.of_work(work)                 # profile declared by plan.json / long.json / edl.json (default 9:16)

Layouts (every profile has the same names, adapted to its shape):
    pip      screen large, camera in a small window that does not touch the caption zone
    screen   screen only (zoom into a region with a `zoom` box), camera hidden
    speaker  camera large, screen hidden
    side     screen and camera side by side (stacked in the vertical and 4:5 profiles)
"""

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

LAYOUT_NAMES = ("pip", "screen", "speaker", "side")


@dataclass(frozen=True)
class Rect:
    x: int
    y: int
    w: int
    h: int

    @property
    def right(self):
        return self.x + self.w

    @property
    def bottom(self):
        return self.y + self.h

    def scaled(self, k):
        return Rect(round(self.x * k), round(self.y * k), round(self.w * k), round(self.h * k))

    def contains(self, other, tol=0):
        return (other.x >= self.x - tol and other.y >= self.y - tol and other.right <= self.right + tol
                and other.bottom <= self.bottom + tol)

    def intersects(self, other):
        return not (other.x >= self.right or other.right <= self.x or other.y >= self.bottom or other.bottom <= self.y)

    def as_dict(self):
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}

    def css(self):
        return f"left:{self.x}px;top:{self.y}px;width:{self.w}px;height:{self.h}px"


@dataclass(frozen=True)
class FormatProfile:
    key: str                     # canonical key, e.g. "16:9"
    name: str                    # human name
    width: int
    height: int
    safe: Rect                   # title-safe area: text, faces, logos and key graphics stay inside
    safe_top: int                # first row the pixel gate accepts for bright overlays
    caption: Rect                # default caption zone
    caption_px: int              # caption font size (cap height grows with it)
    caption_chars: int           # characters per caption line
    caption_lines: int           # lines per caption
    lower_third: Rect            # name/role strip
    platforms: tuple = ()
    layouts: dict = field(default_factory=dict, compare=False, hash=False)

    @property
    def aspect(self):
        return self.width / self.height

    @property
    def vertical(self):
        return self.height > self.width

    def layout(self, name):
        if name not in self.layouts:
            raise KeyError(f"layout {name!r} not in {sorted(self.layouts)} for {self.key}")
        return self.layouts[name]

    def thumb(self, width=None, height=None):
        """Contact-sheet cell size with the profile's aspect (pass a width or a height)."""
        if width:
            return int(width), max(2, round(width / self.aspect))
        height = height or 180
        return max(2, round(height * self.aspect)), int(height)

    def sheet_columns(self, max_width=1400, min_cell=200):
        """Columns that keep a contact sheet <= max_width (vision models read sheets up to ~1400 px)."""
        cell = self.thumb(height=180 if not self.vertical else 320)[0]
        cell = max(min_cell, cell)
        return max(1, min(8, max_width // cell))

    def as_dict(self):
        return {"key": self.key, "name": self.name, "width": self.width, "height": self.height,
                "safe": self.safe.as_dict(), "safe_top": self.safe_top, "caption": self.caption.as_dict(),
                "caption_px": self.caption_px, "caption_chars": self.caption_chars, "caption_lines": self.caption_lines,
                "lower_third": self.lower_third.as_dict(), "platforms": list(self.platforms),
                "layouts": {k: {n: (r.as_dict() if isinstance(r, Rect) else r) for n, r in v.items()}
                            for k, v in self.layouts.items()}}


def _lay(screen, camera, captions):
    return {"screen": screen, "camera": camera, "captions": captions}


R = Rect

VERTICAL = FormatProfile(
    key="9:16", name="vertical (Reels, Shorts, TikTok)", width=1080, height=1920,
    # Reels: top 14 % (270 px) and bottom ~350 px belong to the platform UI; right edge 120 px in y 1000-1700.
    safe=R(60, 270, 960, 1300), safe_top=270, caption=R(70, 1222, 940, 250), caption_px=84, caption_chars=17,
    caption_lines=2, lower_third=R(60, 1010, 820, 150), platforms=("instagram-reels", "youtube-shorts", "tiktok"),
    layouts={
        "pip": _lay(R(0, 330, 1080, 608), R(640, 870, 380, 214), R(70, 1180, 940, 250)),
        "screen": _lay(R(0, 330, 1080, 608), None, R(70, 1180, 940, 250)),
        "speaker": _lay(None, R(0, 300, 1080, 880), R(70, 1222, 940, 250)),
        "side": _lay(R(0, 300, 1080, 608), R(180, 930, 720, 405), R(70, 1360, 940, 200)),
    })

LANDSCAPE = FormatProfile(
    key="16:9", name="landscape (YouTube, classes, lives)", width=1920, height=1080,
    # Action-safe 5 %; the player's progress bar and controls cover the bottom ~60 px on hover.
    safe=R(96, 54, 1728, 972), safe_top=54, caption=R(240, 880, 1440, 140), caption_px=50, caption_chars=42,
    caption_lines=2, lower_third=R(96, 720, 860, 128), platforms=("youtube", "lms", "vimeo"),
    layouts={
        "pip": _lay(R(0, 0, 1920, 1080), R(1456, 600, 416, 234), R(160, 880, 1240, 140)),
        "screen": _lay(R(0, 0, 1920, 1080), None, R(240, 880, 1440, 140)),
        "speaker": _lay(None, R(240, 48, 1440, 810), R(240, 880, 1440, 140)),
        "side": _lay(R(56, 150, 1216, 684), R(1304, 330, 560, 315), R(160, 880, 1600, 140)),
    })

SQUARE = FormatProfile(
    key="1:1", name="square (feed)", width=1080, height=1080,
    safe=R(54, 54, 972, 972), safe_top=54, caption=R(60, 860, 960, 160), caption_px=48, caption_chars=30,
    caption_lines=2, lower_third=R(54, 640, 760, 120), platforms=("instagram-feed", "linkedin", "x"),
    layouts={
        "pip": _lay(R(0, 140, 1080, 608), R(708, 620, 336, 189), R(60, 860, 960, 160)),
        "screen": _lay(R(0, 140, 1080, 608), None, R(60, 860, 960, 160)),
        "speaker": _lay(None, R(90, 54, 900, 760), R(60, 860, 960, 160)),
        "side": _lay(R(24, 220, 700, 394), R(740, 262, 316, 310), R(60, 860, 960, 160)),
    })

PORTRAIT = FormatProfile(
    key="4:5", name="portrait (feed 4:5)", width=1080, height=1350,
    safe=R(54, 68, 972, 1214), safe_top=68, caption=R(60, 1110, 960, 170), caption_px=52, caption_chars=28,
    caption_lines=2, lower_third=R(54, 890, 800, 128), platforms=("instagram-feed", "facebook-feed"),
    layouts={
        "pip": _lay(R(0, 190, 1080, 608), R(700, 740, 340, 191), R(60, 1110, 960, 170)),
        "screen": _lay(R(0, 190, 1080, 608), None, R(60, 1110, 960, 170)),
        "speaker": _lay(None, R(60, 90, 960, 960), R(60, 1110, 960, 170)),
        "side": _lay(R(0, 110, 1080, 608), R(240, 740, 600, 338), R(60, 1110, 960, 170)),
    })


def _scaled(base, key, name, k):
    lay = {n: {p: (r.scaled(k) if isinstance(r, Rect) else r) for p, r in v.items()} for n, v in base.layouts.items()}
    return FormatProfile(key=key, name=name, width=base.width * k, height=base.height * k, safe=base.safe.scaled(k),
                         safe_top=base.safe_top * k, caption=base.caption.scaled(k), caption_px=base.caption_px * k,
                         caption_chars=base.caption_chars, caption_lines=base.caption_lines,
                         lower_third=base.lower_third.scaled(k), platforms=base.platforms, layouts=lay)


LANDSCAPE_4K = _scaled(LANDSCAPE, "16:9-4k", "landscape 4K (3840x2160, optional)", 2)

PROFILES = {p.key: p for p in (VERTICAL, LANDSCAPE, LANDSCAPE_4K, SQUARE, PORTRAIT)}
ALIASES = {
    "vertical": "9:16", "reels": "9:16", "shorts": "9:16", "1080x1920": "9:16", "9x16": "9:16",
    "landscape": "16:9", "youtube": "16:9", "horizontal": "16:9", "1920x1080": "16:9", "16x9": "16:9", "1080p": "16:9",
    "4k": "16:9-4k", "uhd": "16:9-4k", "3840x2160": "16:9-4k", "16:9@4k": "16:9-4k",
    "square": "1:1", "1080x1080": "1:1", "1x1": "1:1",
    "portrait": "4:5", "feed": "4:5", "1080x1350": "4:5", "4x5": "4:5",
}
DEFAULT = "9:16"


def get(key=None):
    """Profile by key or alias; None -> the 9:16 default. Accepts a FormatProfile unchanged."""
    if isinstance(key, FormatProfile):
        return key
    k = str(key or DEFAULT).strip().lower()
    k = ALIASES.get(k, k)
    if k not in PROFILES:
        raise KeyError(f"unknown format {key!r}; use one of {', '.join(PROFILES)}")
    return PROFILES[k]


def by_size(width, height):
    """Profile whose canvas is exactly width x height (None if there is none)."""
    for p in PROFILES.values():
        if (p.width, p.height) == (int(width), int(height)):
            return p
    return None


def of_work(work):
    """Format declared by a work dir: plan.json["format"], long.json["format"] or edl.json["format"]; default 9:16."""
    work = Path(work)
    for name in ("plan.json", "long.json", "edl.json"):
        p = work / name
        if p.exists():
            try:
                data = json.loads(p.read_text())
            except (OSError, ValueError):
                continue
            if isinstance(data, dict) and data.get("format"):
                return get(data["format"])
    return get(DEFAULT)


def crop_for(src_w, src_h, fmt, center_x=0.5, center_y=0.5):
    """ffmpeg crop that fills the profile's aspect from a source frame (cover), centred on (center_x, center_y)."""
    fmt = get(fmt)
    target = fmt.width / fmt.height
    if src_w / src_h > target:
        h = src_h
        w = int(round(h * target / 2) * 2)
    else:
        w = src_w
        h = int(round(w / target / 2) * 2)
    x = int(min(max(0, round(center_x * src_w - w / 2)), src_w - w))
    y = int(min(max(0, round(center_y * src_h - h / 2)), src_h - h))
    return f"crop={w}:{h}:{x}:{y}"


def cover(box, media_w, media_h, focus=(0.5, 0.5)):
    """Scale and offset that make a media of media_w x media_h cover `box` (object-fit: cover with a focus point)."""
    k = max(box.w / media_w, box.h / media_h)
    w, h = media_w * k, media_h * k
    x = min(0.0, max(box.w - w, box.w / 2 - focus[0] * w))
    y = min(0.0, max(box.h - h, box.h / 2 - focus[1] * h))
    return {"scale": k, "x": x, "y": y, "w": w, "h": h}


def zoom_transform(box, region, max_scale=2.5):
    """GSAP vars that zoom a box (its content laid out at box size) into `region` = (x, y, w, h) in fractions.

    Returns {"scale", "x", "y"} for a transform-origin of 0 0. The region is centred and the result never shows
    outside the content.
    """
    rx, ry, rw, rh = region
    s = min(max_scale, max(1.0, min(1.0 / max(rw, 1e-6), 1.0 / max(rh, 1e-6))))
    cx, cy = (rx + rw / 2) * box.w, (ry + rh / 2) * box.h
    x = box.w / 2 - cx * s
    y = box.h / 2 - cy * s
    x = min(0.0, max(box.w - box.w * s, x))
    y = min(0.0, max(box.h - box.h * s, y))
    return {"scale": round(s, 4), "x": round(x, 2), "y": round(y, 2)}


def check_layouts(fmt):
    """Problems in a profile's layouts: boxes outside the canvas, captions outside the safe area or under the camera."""
    fmt = get(fmt)
    canvas = Rect(0, 0, fmt.width, fmt.height)
    problems = []
    for name, lay in fmt.layouts.items():
        for part in ("screen", "camera", "captions"):
            r = lay.get(part)
            if r is not None and not canvas.contains(r):
                problems.append(f"{fmt.key}/{name}: {part} outside the canvas")
        cap = lay["captions"]
        if not fmt.safe.contains(cap, tol=12):
            problems.append(f"{fmt.key}/{name}: captions outside the safe area")
        if lay.get("camera") is not None and lay["camera"].intersects(cap):
            problems.append(f"{fmt.key}/{name}: camera overlaps the captions")
        if lay.get("screen") is None and lay.get("camera") is None:
            problems.append(f"{fmt.key}/{name}: empty layout")
    return problems


def describe():
    rows = []
    for p in PROFILES.values():
        rows.append(f"{p.key:8s} {p.width}x{p.height:<5d} safe {p.safe.x},{p.safe.y} {p.safe.w}x{p.safe.h}  "
                    f"captions y {p.caption.y}-{p.caption.bottom} ({p.caption_px} px, {p.caption_chars} chars/line)  "
                    f"{p.name}")
    return "\n".join(rows)


if __name__ == "__main__":
    print(describe())
    print("layouts:", ", ".join(LAYOUT_NAMES))
    bad = [x for p in PROFILES.values() for x in check_layouts(p)]
    print("layout problems:", bad or "none")
    assert math.isclose(LANDSCAPE.aspect, 16 / 9)
