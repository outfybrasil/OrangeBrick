"""Unit tests for the pure geometry of depthkit. Usage: pytest -q test_depthkit.py"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import depthkit as dk  # noqa: E402


def _apply(H, x, y):
    p = H @ np.array([x, y, 1.0])
    return p[0] / p[2], p[1] / p[2]


def test_homography_maps_the_four_corners():
    quad = [(100, 300), (980, 360), (960, 620), (120, 560)]
    H = dk.homography([(0, 0), (900, 0), (900, 300), (0, 300)], quad)
    for (x, y), (u, v) in zip([(0, 0), (900, 0), (900, 300), (0, 300)], quad):
        pu, pv = _apply(H, x, y)
        assert abs(pu - u) < 1e-6 and abs(pv - v) < 1e-6


def test_plane_matrix3d_is_column_major_css():
    quad = [(40, 70), (560, 120), (550, 260), (40, 230)]
    css = dk.plane_matrix3d(700, 160, quad)
    vals = [float(v) for v in css[len("matrix3d("):-1].split(",")]
    assert len(vals) == 16
    m = np.array(vals).reshape(4, 4).T  # CSS lists columns
    for (x, y), (u, v) in zip([(0, 0), (700, 0), (700, 160), (0, 160)], quad):
        p = m @ np.array([x, y, 0.0, 1.0])
        assert abs(p[0] / p[3] - u) < 1e-4 and abs(p[1] / p[3] - v) < 1e-4


def test_identity_plane():
    css = dk.plane_matrix3d(100, 50, [(0, 0), (100, 0), (100, 50), (0, 50)])
    vals = np.array([float(v) for v in css[len("matrix3d("):-1].split(",")])
    assert np.allclose(vals, np.eye(4).T.reshape(-1), atol=1e-9)


def test_to_stage_cover_fit():
    # 1920x1080 video covering a 1080x1920 box: scale = 1920/1080, centred horizontally
    x, y = dk.to_stage((960, 540), (1920, 1080), (0, 0, 1080, 1920))
    assert abs(x - 540) < 1e-6 and abs(y - 960) < 1e-6
    x0, y0 = dk.to_stage((0, 0), (1920, 1080), (0, 0, 1080, 1920))
    assert abs(y0) < 1e-6 and x0 < 0


def test_hex():
    assert dk._hex("#b46cff") == (180, 108, 255)


def test_front_alpha_keeps_near_planes_softly():
    depth = np.tile(np.linspace(0.0, 10.0, 101, dtype=np.float32), (4, 1))   # far (left) → near (right)
    a = dk.front_alpha(depth, cut=0.5, soft=0.2, blur=0)
    assert a.shape == depth.shape and a.min() == 0.0 and a.max() == 1.0
    assert a[0, 10] == 0.0 and a[0, 95] == 1.0                              # far stays out, near is kept
    row = a[0]
    ramp = row[(row > 0) & (row < 1)]
    assert len(ramp) >= 10 and np.all(np.diff(row) >= -1e-6)               # a soft monotonic ramp, no hard cut
