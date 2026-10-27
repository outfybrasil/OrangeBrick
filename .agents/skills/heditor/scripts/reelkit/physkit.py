"""physkit: rigid-body physics for 3D layers, baked before render (Rapier + three.js + post-processing).

The simulation runs once in Node (physics_bake.mjs) at a fixed step and is stored as per-frame transforms; the
page only interpolates the bake at the HyperFrames time, so every render worker draws the same frame.

    import physkit as pk
    pk.setup(work)                                   # three.js, post-processing addons, player -> composition/assets
    scene = pk.scene(duration=6, floor=True, walls=(3.2, 2.2))
    scene["bodies"] += pk.rain(40, area=(2.4, 1.2), height=(5, 11), size=(0.42, 0.18, 0.42), t=(0, 1.8))
    scene["impulses"].append(pk.blast(t=3.6, center=(0, 0, 0), radius=2.5, strength=7, lift=0.6))
    stats = pk.bake(work, scene, "keys")             # composition/assets/physics-keys.js (+ qa/physics-keys.json)
    pk.importmap()                                   # <script type="importmap"> for "three" and "three/addons/"

In the page: `import bake from "./assets/physics-keys.js"; import { applyBake } from "./assets/physics_player.js";`
then `applyBake(bake, meshesById, t)` inside the hf-seek handler. Full recipe: references/physics-3d.md.
"""

import json
import os
import random
import subprocess
from pathlib import Path

HOME = Path(os.environ.get("HEDITOR_HOME", "~/.heditor")).expanduser()
ASSETS = HOME / "assets"
KIT = Path(__file__).resolve().parent
RAPIER = HOME / "node/node_modules/@dimforge/rapier3d-compat"


def setup(work):
    """Copy three.js (module + core), the post-processing addons and the bake player into the composition."""
    a = Path(work) / "composition/assets"
    a.mkdir(parents=True, exist_ok=True)
    files = [ASSETS / "js/three.module.min.js", ASSETS / "js/three.core.min.js", ASSETS / "licenses/three-LICENSE.txt"]
    for src in files:
        if not src.exists():
            raise FileNotFoundError(f"{src} missing: re-run setup.sh")
        if not (a / src.name).exists():
            (a / src.name).write_bytes(src.read_bytes())
    addons = ASSETS / "js/three-addons"
    if not (addons / "postprocessing/UnrealBloomPass.js").exists():
        raise FileNotFoundError(f"{addons} incomplete: re-run setup.sh")
    for src in addons.rglob("*.js"):
        dst = a / "three-addons" / src.relative_to(addons)
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists():
            dst.write_bytes(src.read_bytes())
    (a / "physics_player.js").write_bytes((KIT / "physics_player.js").read_bytes())
    return a


def importmap():
    """Import map so `import * as THREE from "three"` and `three/addons/...` resolve to the local copies."""
    return ('<script type="importmap">{"imports":{"three":"./assets/three.module.min.js",'
            '"three/addons/":"./assets/three-addons/"}}</script>')


def scene(duration, fps=30, substeps=4, gravity=(0, -9.81, 0), floor=True, floor_size=(30, 30), walls=None,
          wall_height=4.0, friction=0.7, restitution=0.2):
    """Empty scene dict with an optional floor (top at y=0) and an open box of walls (inner half-extents x, z)."""
    st = []
    if floor:
        st.append({"shape": "box", "size": [floor_size[0], 1.0, floor_size[1]], "pos": [0, -0.5, 0],
                   "friction": friction, "restitution": restitution})
    if walls:
        hx, hz = walls
        for x in (-hx - 0.25, hx + 0.25):
            st.append({"shape": "box", "size": [0.5, wall_height, 2 * hz + 1], "pos": [x, wall_height / 2, 0],
                       "friction": friction, "restitution": restitution})
        for z in (-hz - 0.25, hz + 0.25):
            st.append({"shape": "box", "size": [2 * hx + 1, wall_height, 0.5], "pos": [0, wall_height / 2, z],
                       "friction": friction, "restitution": restitution})
    return {"duration": duration, "fps": fps, "substeps": substeps, "gravity": list(gravity), "static": st,
            "bodies": [], "impulses": []}


def rain(n, area=(2.0, 1.0), height=(4.0, 9.0), size=(0.4, 0.2, 0.4), t=(0.0, 1.5), shape="roundbox",
         prefix="k", seed=7, spin=6.0, tags=None, density=1.0, restitution=0.25, friction=0.6):
    """n bodies dropped from random (seeded) points above the floor, spawned over the time window t."""
    rng = random.Random(seed)
    out = []
    for i in range(n):
        out.append({
            "id": f"{prefix}{i}", "shape": shape, "size": list(size),
            "pos": [round(rng.uniform(-area[0], area[0]), 3), round(rng.uniform(*height), 3),
                    round(rng.uniform(-area[1], area[1]), 3)],
            "rot": [round(rng.uniform(-180, 180), 1) for _ in range(3)],
            "angvel": [round(rng.uniform(-spin, spin), 2) for _ in range(3)],
            "vel": [0, round(rng.uniform(-2, 0), 2), 0],
            "spawn": round(t[0] + (t[1] - t[0]) * i / max(1, n - 1), 3),
            "density": density, "restitution": restitution, "friction": friction,
            "tag": (tags[i % len(tags)] if tags else None),
        })
    return out


def blast(t, center=(0, 0, 0), radius=2.5, strength=6.0, lift=0.5, exclude=(), unlock=None):
    """Radial impulse at time t: bodies inside radius are pushed away from center (and up by `lift`).
    The impulse scales with each body's mass (same velocity change for light and heavy bodies); list the
    body that causes the blast (the falling weight) in `exclude` so it is not thrown away by its own blast.
    `unlock` ([x, y, z] booleans or True) releases locked rotations of every existing body at that moment: bodies
    that fell with `"lock": "rotation"` (labels readable) tumble freely after the blast."""
    out = {"t": t, "center": list(center), "radius": radius, "strength": strength, "lift": lift,
           "exclude": list(exclude)}
    if unlock:
        out["unlock"] = unlock
    return out


def bake(work, scene_dict, name="scene"):
    """Run the simulation and write composition/assets/physics-<name>.js (ES module, default export).
    Returns stats (bodies, frames, max speed at the end). A JSON copy goes to qa/ for inspection."""
    if not RAPIER.exists():
        raise RuntimeError(f"{RAPIER} missing: run setup.sh (installs @dimforge/rapier3d-compat in {HOME / 'node'})")
    work = Path(work)
    qa = work / "qa"
    qa.mkdir(parents=True, exist_ok=True)
    scene_path = qa / f"physics-{name}.scene.json"
    out_json = qa / f"physics-{name}.json"
    scene_path.write_text(json.dumps(scene_dict))
    run = subprocess.run(["node", str(KIT / "physics_bake.mjs"), str(scene_path), str(out_json)],
                         capture_output=True, text=True, env={**os.environ, "HEDITOR_HOME": str(HOME)})
    if run.returncode:
        raise RuntimeError(f"physics bake failed: {run.stderr.strip()[-600:]}")
    stats = json.loads(run.stdout.strip().splitlines()[-1])
    a = work / "composition/assets"
    a.mkdir(parents=True, exist_ok=True)
    module = a / f"physics-{name}.js"
    module.write_text("export default " + out_json.read_text() + ";\n")
    stats["module"] = str(module)
    return stats


def landings(bake, ids=None, min_drop=2.0):
    """First contact time of each body after its spawn: the first frame whose vertical speed drops by more than
    `min_drop` m/s from the previous frame (a collision), read from the bake. {id: seconds or None}."""
    fps = bake["fps"]
    out = {}
    for bid, tr in bake["tracks"].items():
        if ids and bid not in ids:
            continue
        f0 = int(round(bake["bodies"][bid].get("spawn", 0) * fps)) + 1
        hit, prev = None, None
        for f in range(max(1, f0), bake["frames"]):
            vy = (tr[f * 7 + 1] - tr[(f - 1) * 7 + 1]) * fps
            if prev is not None and prev < -1.0 and vy - prev > min_drop:
                hit = (f - 1) / fps
                break
            prev = vy
        out[bid] = hit
    return out


def land_on(work, scene_dict, targets, name="scene", passes=3, tolerance=1 / 30):
    """Shift each body's spawn so it *lands* on its target time (a spoken word), then bake.
    targets: {id: seconds}. Bodies falling onto a pile land earlier than onto the floor, so this bakes, measures
    the real contact, corrects the spawn and repeats. Returns (stats, {id: landing error in s})."""
    by_id = {b["id"]: b for b in scene_dict["bodies"] if b.get("id") in targets}
    err, stats = {}, {}
    for k in range(passes):
        stats = bake(work, scene_dict, name)
        bk = json.loads((Path(work) / f"qa/physics-{name}.json").read_text())
        hits = landings(bk, set(targets))
        err = {i: (None if hits[i] is None else round(hits[i] - targets[i], 3)) for i in targets}
        if k == passes - 1 or all(e is not None and abs(e) <= tolerance for e in err.values()):
            break  # the module on disk always matches the reported errors
        for i, e in err.items():
            if e is not None:
                by_id[i]["spawn"] = round(max(0.0, by_id[i]["spawn"] - e), 4)
    stats["landing_error"] = err
    return stats, err


def main(argv):
    import sys
    if len(argv) < 2:
        print("usage: heditor physics <work> <scene.json> [name]")
        return 2
    stats = bake(argv[0], json.loads(Path(argv[1]).read_text()), argv[2] if len(argv) > 2 else "scene")
    print(json.dumps(stats, indent=2))
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv[1:]))
