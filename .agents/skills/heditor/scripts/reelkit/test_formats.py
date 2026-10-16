"""Unit tests for format profiles and style packs. Usage: pytest -q test_formats.py"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import formats as fm  # noqa: E402
import stylepacks as sp  # noqa: E402

STYLES_DIR = Path(__file__).resolve().parents[2] / "references/styles"


def test_profiles_and_aliases():
    assert (fm.get().width, fm.get().height) == (1080, 1920)
    assert fm.get("landscape") is fm.get("16:9") and fm.get("1920x1080").key == "16:9"
    assert (fm.get("4k").width, fm.get("4k").height) == (3840, 2160)
    assert (fm.get("square").width, fm.get("square").height) == (1080, 1080)
    assert (fm.get("4:5").width, fm.get("4:5").height) == (1080, 1350)
    with pytest.raises(KeyError):
        fm.get("21:9")


def test_vertical_profile_keeps_reel_numbers():
    v = fm.get("9:16")
    assert v.safe_top == 270 and v.caption.y == 1222 and v.caption.bottom == 1472


@pytest.mark.parametrize("key", list(fm.PROFILES))
def test_layouts_fit_canvas_and_avoid_captions(key):
    p = fm.get(key)
    assert set(p.layouts) == set(fm.LAYOUT_NAMES)
    assert fm.check_layouts(p) == []


def test_4k_is_exact_double():
    a, b = fm.get("16:9"), fm.get("16:9-4k")
    for name in fm.LAYOUT_NAMES:
        for part in ("screen", "camera", "captions"):
            ra, rb = a.layout(name)[part], b.layout(name)[part]
            assert (ra is None) == (rb is None)
            if ra:
                assert (rb.x, rb.y, rb.w, rb.h) == (ra.x * 2, ra.y * 2, ra.w * 2, ra.h * 2)


def test_thumb_and_crop_keep_aspect():
    assert fm.get("16:9").thumb(width=224) == (224, 126)
    assert fm.get("9:16").thumb(width=270) == (270, 480)
    crop = fm.crop_for(1920, 1080, "9:16")
    w, h, x, y = map(int, crop[5:].split(":"))
    assert h == 1080 and abs(w / h - 9 / 16) < 0.01 and x == (1920 - w) // 2 and y == 0
    w, h, x, y = map(int, fm.crop_for(1920, 1080, "1:1", center_x=0.0)[5:].split(":"))
    assert (w, h, x) == (1080, 1080, 0)


def test_zoom_transform_stays_inside():
    box = fm.Rect(0, 0, 1920, 1080)
    z = fm.zoom_transform(box, (0.5, 0.5, 0.5, 0.5))
    assert z["scale"] == 2.0 and z["x"] <= 0 and z["x"] >= 1920 - 1920 * 2
    z = fm.zoom_transform(box, (0.9, 0.9, 0.2, 0.2))  # corner: clamped, never shows outside
    assert z["x"] == 1920 - 1920 * z["scale"] and z["y"] == 1080 - 1080 * z["scale"]


def test_of_work_reads_plan_long_or_defaults(tmp_path):
    assert fm.of_work(tmp_path).key == "9:16"
    (tmp_path / "long.json").write_text(json.dumps({"format": "4:5"}))
    assert fm.of_work(tmp_path).key == "4:5"
    (tmp_path / "plan.json").write_text(json.dumps({"format": "16:9"}))
    assert fm.of_work(tmp_path).key == "16:9"


def test_every_named_style_has_a_pack():
    styles = sorted(p.stem for p in STYLES_DIR.glob("*.md") if p.stem != "INDEX")
    assert len(styles) >= 35
    assert sorted(sp.SLUGS) == styles


def _lum(hex_):
    h = hex_.lstrip("#")
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def _contrast(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


@pytest.mark.parametrize("slug", ["creative"] + list(sp.SLUGS))
def test_pack_tokens_valid_and_active_word_readable(slug):
    p = sp.get(slug)
    assert p["chapter_card"] in sp.CARD_KINDS and p["lower_third"] in sp.LOWER_KINDS
    assert p["transition"]["kind"] in sp.TRANSITIONS
    for role in ("display", "body", "mono", "caption"):
        assert p["fonts"][role] in ("Anton", "Bebas Neue", "Geist", "Inter", "JetBrains Mono", "IBM Plex Mono", "VT323",
                                    "Press Start 2P", "Playfair Display", "Fraunces", "DM Serif Display", "Caveat",
                                    "B612 Mono", "Fredoka"), (slug, role)
    c = p["captions"]
    ground = c["active_bg"] or (c["box"] if c["box"] and c["box"].startswith("#") else p["palette"]["bg"])
    if ground.startswith("#") and c["active_fg"].startswith("#"):
        assert _contrast(c["active_fg"], ground) >= 4.5, (slug, c["active_fg"], ground)
    css = sp.css_vars(p)
    assert "--accent:" in css and "--cap-active-fg:" in css


def test_reel_page_canvas_defaults_to_vertical():
    import reelkit as rk
    kw = dict(title="t", duration=5.0, card_w=960, card_h=540, face_origin="50% 50%", videos=[], scenes_html="",
              css="", js="", keys={"rigStates": {"hero": {}}, "rig": []}, caps=[])
    assert 'data-width="1080" data-height="1920"' in rk.page(**kw)
    assert 'data-width="1920" data-height="1080"' in rk.page(fmt="16:9", **kw)
