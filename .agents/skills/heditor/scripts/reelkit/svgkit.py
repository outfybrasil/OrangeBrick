"""svgkit: clean an SVG with SVGO before animating it, and prove it still looks the same.

Logos and drawings exported from Figma/Illustrator carry editor metadata, transforms nested in groups, shapes that
DrawSVG cannot draw cleanly and paths with too many points for MorphSVG. `optimize()` runs SVGO (installed by setup
in ~/.heditor/node) with a config chosen for what the SVG will do on screen, then renders the original and the result
in the HyperFrames Chrome and compares the pixels, so a clean-up never silently changes the artwork.

Modes:
  static  smallest file; ids kept so GSAP can still target parts
  draw    for DrawSVGPlugin: keeps shapes and separate paths (no path merging), keeps strokes, 3 decimals
  morph   for MorphSVGPlugin: shapes converted to <path>, paths kept separate, 3 decimals

CLI: heditor svg <in.svg> [out.svg] [static|draw|morph]
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HOME = Path(os.environ.get("HEDITOR_HOME", "~/.heditor")).expanduser()
SVGO = HOME / "node/node_modules/svgo/bin/svgo.js"
MODES = ("static", "draw", "morph")
SHAPES = ("path", "rect", "circle", "ellipse", "line", "polyline", "polygon")


def _config(mode):
    keep = {"cleanupIds": False}  # GSAP targets parts by id
    if mode in ("draw", "morph"):
        keep.update({"mergePaths": False, "convertShapeToPath": mode == "morph"})
    overrides = ",".join(f"{k}: {json.dumps(v)}" for k, v in keep.items())
    precision = 3 if mode in ("draw", "morph") else 2
    plugins = [f"{{ name: 'preset-default', params: {{ overrides: {{ {overrides} }} }} }}"]
    if mode == "morph":
        plugins.append("{ name: 'convertShapeToPath', params: { convertArcs: true } }")
    return (f"export default {{ multipass: true, floatPrecision: {precision}, "
            f"js2svg: {{ indent: 0, pretty: false }}, plugins: [{', '.join(plugins)}] }};\n")


def counts(svg_text):
    """Element counts that matter for animation (paths, other shapes, ids)."""
    return {"bytes": len(svg_text.encode()),
            **{tag: len(re.findall(rf"<{tag}[\s/>]", svg_text)) for tag in SHAPES},
            "ids": len(re.findall(r'\sid="', svg_text))}


def _chrome():
    chrome = os.environ.get("HEDITOR_CHROME", "")
    if not chrome or not Path(chrome).exists():
        raise RuntimeError("HEDITOR_CHROME not set: source ~/.heditor/env.sh (run setup.sh)")
    return chrome


def render(svg_path, png_path, size=512, bg="#ffffff"):
    """Rasterise an SVG in the same Chrome HyperFrames uses (contain-fit into size×size)."""
    page = Path(tempfile.mkdtemp(prefix="svgkit-")) / "page.html"
    data = Path(svg_path).read_text()
    page.write_text(f"<html><body style='margin:0;background:{bg}'>"
                    f"<div style='width:{size}px;height:{size}px;display:flex'>"
                    f"<img src='data:image/svg+xml;base64,{_b64(data)}' "
                    f"style='width:100%;height:100%;object-fit:contain'></div></body></html>")
    subprocess.run([_chrome(), "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    f"--window-size={size},{size}", f"--screenshot={png_path}", page.as_uri()],
                   capture_output=True, check=True, timeout=120)
    shutil.rmtree(page.parent, ignore_errors=True)
    return png_path


def _b64(text):
    import base64
    return base64.b64encode(text.encode()).decode()


def compare(a_png, b_png, out_png=None):
    """Mean absolute difference (0-255) and share of pixels that changed by more than 48 levels."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(a_png).convert("RGB"), dtype=np.int16)
    b = np.asarray(Image.open(b_png).convert("RGB"), dtype=np.int16)
    d = np.abs(a - b).max(axis=2)
    if out_png:
        h, w = d.shape
        sheet = Image.new("RGB", (w * 3, h), "white")
        sheet.paste(Image.open(a_png).convert("RGB"), (0, 0))
        sheet.paste(Image.open(b_png).convert("RGB"), (w, 0))
        sheet.paste(Image.fromarray((255 - np.clip(d * 4, 0, 255)).astype("uint8")).convert("RGB"), (w * 2, 0))
        sheet.save(out_png)
    return {"mean_diff": round(float(d.mean()), 3), "changed_px": round(float((d > 48).mean()), 5)}


def optimize(src, dst=None, mode="static", check=True, max_mean=1.0, max_changed=0.004):
    """SVGO clean-up for animation. Returns a report; raises if the result does not look like the original."""
    if mode not in MODES:
        raise ValueError(f"mode must be one of {MODES}")
    if not SVGO.exists():
        raise RuntimeError(f"{SVGO} missing: run setup.sh (installs svgo in {HOME / 'node'})")
    src = Path(src)
    dst = Path(dst) if dst else src.with_name(f"{src.stem}.{mode}.svg")
    with tempfile.TemporaryDirectory(prefix="svgkit-") as tmp:
        cfg = Path(tmp) / "svgo.config.mjs"
        cfg.write_text(_config(mode))
        run = subprocess.run(["node", str(SVGO), "--config", str(cfg), "-i", str(src), "-o", str(dst)],
                             capture_output=True, text=True)
        if run.returncode:
            raise RuntimeError(f"svgo failed: {run.stderr.strip()[-400:]}")
        before, after = counts(src.read_text()), counts(dst.read_text())
        report = {"src": str(src), "dst": str(dst), "mode": mode, "before": before, "after": after,
                  "saved": round(1 - after["bytes"] / max(1, before["bytes"]), 3)}
        if mode == "morph":
            report["note"] = "all shapes are <path> now" if not any(after[t] for t in SHAPES[1:]) else \
                "some shapes were kept (morph them with MorphSVGPlugin.convertToPath)"
        if check:
            a, b = Path(tmp) / "a.png", Path(tmp) / "b.png"
            render(src, a)
            render(dst, b)
            sheet = dst.with_suffix(".check.png")
            report["visual"] = compare(a, b, sheet)
            report["check_sheet"] = str(sheet)
            report["ok"] = report["visual"]["mean_diff"] <= max_mean and report["visual"]["changed_px"] <= max_changed
    return report


def inline(src, cls="", mode="static", out_dir=None):
    """Optimised SVG markup ready to paste into a page (cached next to the source or in out_dir).
    Fails loudly when the optimised file does not look like the original."""
    src = Path(src)
    dst = Path(out_dir or src.parent) / f"{src.stem}.{mode}.svg"
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        report = optimize(src, dst, mode)
        if not report.get("ok", True):
            raise RuntimeError(f"{src}: optimised SVG differs from the original ({report['visual']}); "
                               f"see {report['check_sheet']}")
    svg = re.sub(r"<\?xml[^>]*>|<!DOCTYPE[^>]*>", "", dst.read_text()).strip()
    return svg.replace("<svg", f'<svg class="{cls}"', 1) if cls else svg


def _num(el, name, default=0.0):
    v = el.get(name)
    return float(v) if v not in (None, "", "auto") else default


def single_path(svg_text):
    """All drawable shapes of an SVG merged into one path `d` (rect with rx, circle, ellipse, line, polyline,
    polygon converted). MorphSVGPlugin morphs one path into one path, so icon → icon morphs need this. Transforms
    on elements are not applied (Lucide and SVGO output have none)."""
    import xml.etree.ElementTree as ET
    root = ET.fromstring(re.sub(r"<\?xml[^>]*>|<!DOCTYPE[^>]*>", "", svg_text).strip())
    parts = []
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        if tag == "path" and el.get("d"):
            d = (el.get("d") or "").strip()
            # a path's first moveto is absolute even when written "m"; once concatenated it would become
            # relative to the previous sub-path, so rewrite "m x y rest" as "M x y l rest"
            m = re.match(r"m\s*(-?(?:\d*\.\d+|\d+)(?:e-?\d+)?)[\s,]*(-?(?:\d*\.\d+|\d+)(?:e-?\d+)?)(.*)", d, re.S)
            if m:
                rest = m.group(3)
                d = f"M{m.group(1)} {m.group(2)}" + (("l" + rest.lstrip(" ,")) if re.match(r"[\s,]*[-\d.]", rest)
                                                     else rest)
            parts.append(d)
        elif tag == "rect":
            x, y, w, h = _num(el, "x"), _num(el, "y"), _num(el, "width"), _num(el, "height")
            rx = _num(el, "rx") if el.get("rx") else None
            ry = _num(el, "ry") if el.get("ry") else None
            rx = min(rx if rx is not None else (ry or 0), w / 2)
            ry = min(ry if ry is not None else rx, h / 2)
            if rx or ry:
                parts.append(f"M{x + rx} {y}H{x + w - rx}A{rx} {ry} 0 0 1 {x + w} {y + ry}V{y + h - ry}"
                             f"A{rx} {ry} 0 0 1 {x + w - rx} {y + h}H{x + rx}A{rx} {ry} 0 0 1 {x} {y + h - ry}"
                             f"V{y + ry}A{rx} {ry} 0 0 1 {x + rx} {y}Z")
            else:
                parts.append(f"M{x} {y}H{x + w}V{y + h}H{x}Z")
        elif tag in ("circle", "ellipse"):
            cx, cy = _num(el, "cx"), _num(el, "cy")
            rx = _num(el, "r") if tag == "circle" else _num(el, "rx")
            ry = _num(el, "r") if tag == "circle" else _num(el, "ry")
            parts.append(f"M{cx - rx} {cy}A{rx} {ry} 0 1 0 {cx + rx} {cy}A{rx} {ry} 0 1 0 {cx - rx} {cy}Z")
        elif tag == "line":
            parts.append(f"M{_num(el, 'x1')} {_num(el, 'y1')}L{_num(el, 'x2')} {_num(el, 'y2')}")
        elif tag in ("polyline", "polygon"):
            pts = re.findall(r"-?[\d.]+(?:e-?\d+)?", el.get("points", ""))
            xy = [f"{pts[i]} {pts[i + 1]}" for i in range(0, len(pts) - 1, 2)]
            if xy:
                parts.append("M" + "L".join(xy) + ("Z" if tag == "polygon" else ""))
    return " ".join(parts)


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    src = argv[0]
    dst = argv[1] if len(argv) > 1 and argv[1] not in MODES else None
    mode = next((a for a in argv[1:] if a in MODES), "static")
    report = optimize(src, dst, mode)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if report.get("ok", True) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
