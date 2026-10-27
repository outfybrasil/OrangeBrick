"""Tests for the motion helpers: GSAP plugin tags, SVGO clean-up (svgkit) and baked physics (physkit).
Usage: pytest -q test_motion.py   (SVG/physics tests skip when node tools or Chrome are missing)"""

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import physkit as pk  # noqa: E402
import reelkit as rk  # noqa: E402
import svgkit as sk  # noqa: E402

HAVE_SVGO = sk.SVGO.exists()
HAVE_CHROME = Path(os.environ.get("HEDITOR_CHROME", "/nonexistent")).exists()
HAVE_RAPIER = pk.RAPIER.exists()

MESSY = """<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with an editor -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
     width="400" height="300" viewBox="0 0 400 300" inkscape:version="1.3">
  <metadata id="meta"><title>demo</title></metadata>
  <g id="layer" transform="translate(10.000000,20.000000)">
    <circle id="dot" cx="290.000000" cy="80.000000" r="50.000000" style="fill:#f5c66b;stroke:#111;stroke-width:6"/>
    <path id="line" d="M 30.000000,200.000000 C 90.000000,150.000000 150.000000,250.000000 210.000000,200.000000"
          style="fill:none;stroke:#e11d48;stroke-width:10.000000;stroke-linecap:round"/>
    <path id="arrow" d="M 300.0,230.0 L 340.0,250.0 L 300.0,270.0 Z" style="fill:#e11d48"/>
  </g>
</svg>"""


def test_gsap_plugin_tags_aliases_and_dependencies():
    tags = rk.gsap_plugin_tags(["SplitText", "DrawSVG", "CustomWiggle"])
    assert 'src="assets/gsap/SplitText.min.js"' in tags
    assert 'src="assets/gsap/DrawSVGPlugin.min.js"' in tags
    assert tags.index("CustomEase.min.js") < tags.index("CustomWiggle.min.js")  # dependency first
    assert "gsap.registerPlugin(SplitText,DrawSVGPlugin,CustomEase,CustomWiggle)" in tags
    assert rk.gsap_plugin_tags([]) == ""
    with pytest.raises(ValueError):
        rk.gsap_plugin_tags(["ScrollTrigger"])  # interaction plugin: not shipped for renders


def test_base_js_has_deterministic_scramble():
    assert "function scramble(" in rk.BASE_JS and "Math.random" not in rk.BASE_JS


@pytest.mark.skipif(not (HAVE_SVGO and HAVE_CHROME), reason="svgo or Chrome missing (run setup.sh)")
def test_svg_draw_mode_keeps_paths_and_look(tmp_path):
    src = tmp_path / "messy.svg"
    src.write_text(MESSY)
    rep = sk.optimize(src, tmp_path / "messy.draw.svg", "draw")
    assert rep["ok"], rep["visual"]
    assert rep["after"]["bytes"] < rep["before"]["bytes"]
    assert rep["after"]["path"] == 2 and rep["after"]["circle"] == 1  # nothing merged or converted
    out = (tmp_path / "messy.draw.svg").read_text()
    assert 'id="line"' in out and "metadata" not in out and "inkscape" not in out


@pytest.mark.skipif(not (HAVE_SVGO and HAVE_CHROME), reason="svgo or Chrome missing (run setup.sh)")
def test_svg_morph_mode_converts_shapes(tmp_path):
    src = tmp_path / "messy.svg"
    src.write_text(MESSY)
    rep = sk.optimize(src, tmp_path / "messy.morph.svg", "morph")
    assert rep["ok"], rep["visual"]
    assert rep["after"]["circle"] == 0 and rep["after"]["path"] == 3
    markup = sk.inline(src, cls="logo", mode="morph", out_dir=tmp_path)
    assert markup.startswith('<svg class="logo"')


def _small_scene():
    sc = pk.scene(duration=2.0, walls=(1.0, 1.0), wall_height=0.6)
    sc["bodies"] += pk.rain(8, area=(0.6, 0.6), height=(2, 4), size=(0.3, 0.2, 0.3), t=(0.0, 0.5), seed=3)
    sc["bodies"].append({"id": "late", "shape": "ball", "radius": 0.2, "pos": [0, 3, 0], "spawn": 1.0})
    sc["impulses"].append(pk.blast(t=1.5, radius=2, strength=3, exclude=["late"]))
    return sc


@pytest.mark.skipif(not HAVE_RAPIER, reason="rapier missing (run setup.sh)")
def test_physics_bake_is_deterministic_and_settles(tmp_path):
    sc = _small_scene()
    s1 = pk.bake(tmp_path, sc, "t")
    h1 = hashlib.sha256((tmp_path / "qa/physics-t.json").read_bytes()).hexdigest()
    pk.bake(tmp_path, sc, "t")
    h2 = hashlib.sha256((tmp_path / "qa/physics-t.json").read_bytes()).hexdigest()
    assert h1 == h2
    assert s1["bodies"] == 9 and s1["frames"] == 61
    bake = json.loads((tmp_path / "qa/physics-t.json").read_text())
    last = bake["frames"] - 1
    for tr in bake["tracks"].values():
        assert tr[last * 7 + 1] > 0.0          # nothing fell through the floor
        q = tr[last * 7 + 3:last * 7 + 7]
        assert abs(sum(v * v for v in q) - 1) < 1e-3
    assert (tmp_path / "composition/assets/physics-t.js").read_text().startswith("export default {")


@pytest.mark.skipif(not HAVE_RAPIER, reason="rapier missing (run setup.sh)")
def test_physics_player_interpolates_and_hides_before_spawn(tmp_path):
    pk.bake(tmp_path, _small_scene(), "t")
    player = Path(pk.__file__).with_name("physics_player.js").resolve()
    js = f"""
    const m = await import({json.dumps(player.as_uri())});
    const bake = (await import({json.dumps((tmp_path / 'composition/assets/physics-t.js').as_uri())})).default;
    const a = m.bakeState(bake, 'late', 0.5), b = m.bakeState(bake, 'late', 1.0);
    const f = 12, tr = bake.tracks.k0, s = m.bakeState(bake, 'k0', f / bake.fps);
    const exact = [0,1,2].every(i => Math.abs(s.p[i] - tr[f*7+i]) < 1e-9);
    const mid = m.bakeState(bake, 'k0', (f + 0.5) / bake.fps);
    const between = [0,1,2].every(i => Math.min(tr[f*7+i], tr[f*7+7+i]) - 1e-9 <= mid.p[i]
                                     && mid.p[i] <= Math.max(tr[f*7+i], tr[f*7+7+i]) + 1e-9);
    console.log(JSON.stringify({{hiddenBefore: !a.visible, visibleAt: b.visible, exact, between}}));
    """
    out = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True)
    res = json.loads(out.stdout.strip().splitlines()[-1])
    assert res == {"hiddenBefore": True, "visibleAt": True, "exact": True, "between": True}


def test_single_path_merges_shapes_and_fixes_relative_moveto():
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/>'
           '<circle cx="12" cy="12" r="3"/><line x1="8" y1="21" x2="16" y2="21"/>'
           '<path d="m4 17 6-6-6-6"/><polyline points="1 2 3 4 5 6"/></svg>')
    d = sk.single_path(svg)
    assert d.count("M") == 5 and "A2.0 2.0" in d and "A3.0 3.0" in d
    assert "M4 17l6-6-6-6" in d                     # first relative moveto made absolute, the rest kept relative
    assert "m4" not in d


@pytest.mark.skipif(not (HAVE_SVGO and HAVE_CHROME), reason="Chrome missing (run setup.sh)")
def test_single_path_looks_identical_to_the_icon(tmp_path):
    rk.ensure_icons(["laptop"])
    src = (rk.ICON_SRC / "laptop.svg").read_text().replace("currentColor", "black")
    one = ('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" '
           'stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
           f'<path d="{sk.single_path(src)}"/></svg>')
    (tmp_path / "a.svg").write_text(src)
    (tmp_path / "b.svg").write_text(one)
    sk.render(tmp_path / "a.svg", tmp_path / "a.png")
    sk.render(tmp_path / "b.svg", tmp_path / "b.png")
    assert sk.compare(tmp_path / "a.png", tmp_path / "b.png")["changed_px"] < 0.001


def test_caption_pill_colours_default_unchanged():
    caps = [{"id": "c0", "start": 0, "end": 1, "text": "a b",
             "words": [{"shown": "a", "start": 0}, {"shown": "b", "start": 0.5}]}]
    assert 'backgroundColor:"#ffd84d"' in rk.captions_js(caps, mode="pill")
    js = rk.captions_js(caps, mode="pill", pill=("#03100b", "#7dffb0"))
    assert 'color:"#03100b",backgroundColor:"#7dffb0"' in js and "rgba(125,255,176,0)" in js


@pytest.mark.skipif(not HAVE_RAPIER, reason="rapier missing (run setup.sh)")
def test_locks_unlock_and_land_on(tmp_path):
    sc = pk.scene(duration=4.0, substeps=8)
    sc["bodies"] = [
        {"id": "up", "shape": "roundbox", "size": [1, 0.4, 0.6], "pos": [-1, 5, 0], "rot": [0, 0, 0],
         "angvel": [0, 0, 3], "spawn": 0.2, "lock": "rotation"},
        {"id": "col", "shape": "roundbox", "size": [1, 0.4, 0.6], "pos": [1.5, 5, 0], "vel": [2, 0, 0],
         "spawn": 0.2, "lock": "vertical"},
    ]
    sc["impulses"] = [pk.blast(t=2.5, center=(0, 0, 0), radius=4, strength=6, lift=0.5, unlock=True)]
    stats, err = pk.land_on(tmp_path, sc, {"up": 1.5, "col": 1.0}, "locks")
    assert all(abs(e) <= 1 / 30 + 1e-6 for e in err.values()), err
    bk = json.loads((tmp_path / "qa/physics-locks.json").read_text())
    up, col = bk["tracks"]["up"], bk["tracks"]["col"]
    f_before = int(2.4 * 30)
    assert abs(up[f_before * 7 + 6]) > 0.9999            # rotation locked until the blast: still upright
    assert all(abs(col[f * 7] - 1.5) < 1e-6 for f in range(bk["frames"]))   # vertical lock: x never moves
    assert max(abs(up[f * 7 + 6]) for f in range(f_before, bk["frames"])) <= 1.0
